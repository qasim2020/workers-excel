// pull google details address, contacts, phone numbers etc to local computer in a text file

console.log(" — APP STARTED : Pull google details address, contacts, phone numbers etc to local computer in a text file");

const Airtable = require('airtable');
const readXlsxFile = require('read-excel-file/node');
const fs = require('fs');
const axios = require('axios');
const { similarity, editDistance } = require("./similarity.js");
var env = process.env.NODE_ENV || 'development';


if (env === 'development' || env === 'test') {
  var config = require('./config.json');
  var envConfig = config[env];
  Object.keys(envConfig).forEach((key) => {
    process.env[key] = envConfig[key];
  });
}

// /Users/qasim/NodeJs/workers-excel/airtable_sample.xlsx
// airtable_sample_small.xlsx
let testFiles = "";

fullProcedure = function() {
    readXlsxFile('airtable_sample_small.xlsx').then( rows => {

        rows.shift();
        console.log(`— DATA has ${rows.length} Rows`);
        let obj = rows.map( val => {
            return {
                string: val[0] + " " + val[3],
                meta: val
            }
        });

        let placeId = [];
        obj.forEach( (val, index)  => {

            console.log(`- INDEX No ${index} is going to be fetched from PLACES API`);

            let config = {
                method: 'get',
                url: `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${val.string}&inputtype=textquery&fields=formatted_address%2Cname%2Crating%2Copening_hours%2Cgeometry%2Cplace_id&key=${process.env.places}`,
                headers: { }
            };

            axios(config)
            .then(function (response) {
                // console.log(JSON.stringify(response.data, 0, 2));

                Object.assign( val , {
                    api1 : response.data
                });

                placeId.push(val);
                console.log( `— Pulled ${placeId.length} out of ${obj.length} `); 

                if (placeId.length == obj.length) {

                    console.log("— Job Completed now write the data inside the file");
                    // return console.log(placeId);
                    fs.writeFile(
                        'place_id.json', 
                        JSON.stringify( placeId , 0 , 2 ) , 
                        (err) => {
                            if (err) {
                              return console.log('!!!!! — failed to backup');
                            }
                            return console.log('— success , created place_id.json');
                        });

                };

                return;
                
                // if job done here write else wait until all indexes are updated
            })
            .catch(function (error) {
                console.log(error);
            });

        });

          // `rows` is an array of rows
          // each row being an array of cells.

    })

};

let fetchPlaceInfo = function() {

    fs.readFile(`place_id.json`, 'utf8', (err, input) => {

        if (err) {
            return console.log(err);
        }

        let placeId = [],
            data = JSON.parse(input);

        data.forEach( (val, index) => {

            console.log(`- INDEX No ${index} is going to be fetched from PLACES API`);

            let matchIndex = [];

            console.log(val);

            val.api1.candidates.forEach( val1 => {

                let match = similarity(val.string, val1.name + " " + val1.formatted_address);

                Object.assign(val1, {
                    match: match
                });

                matchIndex.push(match);

            });

            let max = Math.max( ...matchIndex );

            console.log( max );

            val.api1 = val.api1.candidates.find( val1 => val1.match == max );

            let fields = [
                'name',
                'formatted_address', 
                'formatted_phone_number',
                'international_phone_number',
                'name', 
                'photos', 
                'price_level', 
                'rating', 
                'reviews', 
                'url', 
                'user_ratings_total', 
                'utc_offset', 
                'website'
            ];

            fields = fields.join("%2C")

            console.log(" — Pull place details through place Ids");

            let config = {
                method: 'get',
                url: `https://maps.googleapis.com/maps/api/place/details/json?place_id=${val.api1.place_id}&fields=${fields}&key=${process.env.places}`, 
                headers: { }
            };

            axios(config)
            .then(function (response) {
                console.log(JSON.stringify(response.data, 0, 2));
                Object.assign( val, {
                    api2: response.data
                });
                placeId.push(val);
                console.log( `— Pulled ${placeId.length} out of ${data.length} `); 
                if (placeId.length == data.length) {

                    console.log("— Job Completed now write the data inside the file");
                    fs.writeFile(
                        'place_full_info.json', 
                        JSON.stringify( placeId , 0 , 2 ) , 
                        (err) => {
                            if (err) {
                              return console.log('!!!!! — failed to backup');
                            }
                            return console.log('— SUCCESS , created place_full_info.json');
                        }
                    );

                };

                return;
            })
            .catch(function (error) {
                console.log(error);
            });


        });

    });

};

let push_to_airtable = function() {

    fs.readFile(`place_full_info.json`, 'utf8', (err, input) => {

        if (err) {
            return console.log(err);
        }

        let data = JSON.parse(input);

        data.forEach( (val, index) => {

            console.log(val.api2);

        });

        return;
        return console.log(input);

        let obj = rows.map( val => {
            return {
                fields: {
                    URL: val[0], 
                    Business: val[1],
                    Rating: Math.floor( Number(val[2]) ) == 0 ? null : Math.floor( Number(val[2]) ), 
                    Reviews: val[3], 
                    "Google Type": val[5], 
                    Desc: `${val[6]} ${val[7]} ${val[8]} ${val[9]} ${val[10]}`, 
                    Number: getNumber( val ),
                    "Custom Type": "Logistics"
                }
            }
        }).filter( val => val.fields.Number && val.fields.Number.length > 0 );

        console.log( JSON.stringify( obj, 0, 2 ) );
        console.log( obj.length );
        return console.log("here verify if data is good, push to airtable"); console.log("APP ENDED"); console.log(" ---- " );

        obj.forEach( (val, index)  => {
            base('list').create([ val ], {typecast: true}, function(err, records) {
                  console.log(val);
                  if (err) {
                      console.log(`INDEX = ${index} FAILED`);
                      console.error(err);
                      return;
                  }
                  records.forEach(function (record) {
                      console.log(`${index} Uploaded to Airtable`);
                      console.log(record.getId());
                  });
            });
        });
    })

};

fs.readdir("./", (err, files) => {
    testFiles = {
        place_id: files.some( val => val == "place_id.json" ),
        place_full_info: files.some( val => val == "place_full_info.json" ),
    }
    console.log( testFiles );

    switch (true) {
        case (testFiles.place_full_info) :
            console.log("push the data to airtable");
            push_to_airtable();
            // TODO: Sift the data according to airtable requirement 
            // - and push all of it into airtable test file 
            // - pull all of CSV from airtable 
            // - push all of it through the script back to the Airtable
            break;
        case (testFiles.place_id) : 
            console.log("fetch the place_full_info");
            fetchPlaceInfo();
            break;
        default: 
            console.log("fetch google from sample - create place_id.json - create place_full_info.json - push the data to airtable");
            fullProcedure();
            break;
    }
});

return;

