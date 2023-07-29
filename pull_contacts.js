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

var base = new Airtable({apiKey: process.env.Airtable}).base(process.env.list);

// /Users/qasim/NodeJs/workers-excel/airtable_sample.xlsx
// airtable_sample_small.xlsx
// airtable_sample2
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

        let obj = data.map( val => {

            // console.log(JSON.stringify( val, 0, 2 ) );
            console.log(val);

            let photos = val.api2.result.photos.map( (val2, index) => {
                return { 
                    url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${val2.photo_reference}&key=${process.env.places}` 
                }
            });

            return {
                fields: {
                      "id": val.api1.place_id, 
                      "name": val.api1.name,
                      "geometry": JSON.stringify(val.api1.geometry),
                      "match" : val.api1.match.toString(),
                      "address": val.api2.result.formatted_address,
                      "phone": val.api2.result.formatted_phone_number,
                      "rating": val.api1.rating.toString(), 
                      "reviews": JSON.stringify( val.api2.result.reviews ),
                      "googleURL": val.api2.result.url,
                      "businessURL": val.api2.result.website,
                      "googleType": val.meta[6],
                      "customType": val.meta[7],
                      "photos": photos 
                }
            }


        });

        console.log(JSON.stringify( obj, 0, 2 ) );


        // return console.log("here verify if data is good, push to airtable"); console.log("APP ENDED"); console.log(" ---- " );
        let action_done = function(input) {
            fs.writeFile(
                'places_pushed_to_airtable.json', 
                input, 
                (err) => {
                    console.log("APP ENDED");
                    if (err) {
                      return console.log('!!!!! — failed to backup');
                    }
                    return console.log('— SUCCESS , created places_pushed_to_airtable.json');
                });
        };

        let results = [];
        obj.forEach( (val, index)  => {
            base('list2').create([ val ], {typecast: true}, function(err, records) {
                  console.log(val);

                  let reply = err || records;
                  results.push( reply );

                  if (err) {
                      console.log(`INDEX = ${index} FAILED`);
                      console.error(err);
                      return;
                  }
                  records.forEach(function (record) {
                      console.log(`${index} Uploaded to Airtable`);
                      console.log(record.getId());
                  });

                  if( results.length == obj.length ) action_done( JSON.stringify( results, 0, 2 ) );
            });
        });
    })

};

let after_pushing_to_airtable = function() {


    fs.readFile(`places_pushed_to_airtable.json`, 'utf8', (err, input) => {

        console.log(err);
        console.log(input);

    });

};

fs.readdir("./", (err, files) => {
    testFiles = {
        place_id: files.some( val => val == "place_id.json" ),
        place_full_info: files.some( val => val == "place_full_info.json" ),
        places_pushed_to_airtable: files.some( val => val == "places_pushed_to_airtable.json" )
    }

    console.log( testFiles );

    switch (true) {
        // TEST 1 = DATA PUSHED TO AIRTABLE
        case (testFiles.places_pushed_to_airtable) :
            console.log("TEST 1 = DATA PUSHED TO AIRTABLE");
            after_pushing_to_airtable();
            break;
        // TEST 2 = DATA PENDING PUSH TO AIRTABLE
        case (testFiles.place_full_info) :
            console.log("TEST 2 = DATA PENDING PUSH TO AIRTABLE");
            push_to_airtable();
            break;
        // TEST 3 = FETCH PLACES PHONE NUMBERS (API2)
        case (testFiles.place_id) : 
            console.log("TEST 3 = FETCH PLACES PHONE NUMBERS (API2) ");
            fetchPlaceInfo();
            break;
        // TEST 4 = FETCH PLACES IDs (API1)
        default: 
            console.log("TEST 4 = FETCH PLACES IDs (API1)");
            fullProcedure();
            break;
    }
});

return;

