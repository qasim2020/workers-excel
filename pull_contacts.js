console.log(" pull google details address, contacts, phone numbers etc to local computer in a text file");

const readXlsxFile = require('read-excel-file/node');
const fs = require('fs');
const axios = require('axios');
var env = process.env.NODE_ENV || 'development';

if (env === 'development' || env === 'test') {
  var config = require('./config.json');
  var envConfig = config[env];
  Object.keys(envConfig).forEach((key) => {
    process.env[key] = envConfig[key];
  });
}

// /Users/qasim/NodeJs/workers-excel/airtable_sample.xlsx

let testFiles = "";

fullProcedure = function() {
    readXlsxFile('airtable_sample.xlsx').then( rows => {
        rows.shift();
        console.log(rows);
        let obj = rows.map( val => {
            return {
                string: val[0] + " " + val[3],
                meta: val
            }
        });

        obj.forEach( (val, index)  => {

            if (index > 1) return console.log("APP ENDED -- HERE AFTER RUN ONCE SURE");
            console.log({index});

            console.log( val.string );

            let config = {
                method: 'get',
                url: `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${val.string}&inputtype=textquery&fields=formatted_address%2Cname%2Crating%2Copening_hours%2Cgeometry%2Cplace_id&key=${process.env.places}`,
                headers: { }
            };

            axios(config)
            .then(function (response) {
                console.log(JSON.stringify(response.data, 0, 2));
                Object.assign( val , {
                    api_data_1 : JSON.stringify(response.data)
                });
                fs.writeFile(
                    'place_id.json', 
                    JSON.stringify( val , 0 , 2 ) , 
                    (err) => {
                        if (err) {
                          return console.log('Failed to backup');
                        }
                        return console.log('SUCCESS ::::  created place_id.json');
                    });
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

    fs.readFile(`place_id.json`, 'utf8', (err, data) => {
        if (err) {
            return console.log(err);
        }
        console.log( data );
    });

};

fs.readdir("./", (err, files) => {
    testFiles = {
        place_id: files.some( val => val == "place_id.json" ),
        place_full_info: files.some( val => val == "place_full_info.json" )
    }
    console.log( testFiles );

    switch (true) {
        case (testFiles.place_id) : 
            console.log("fetch the place_full_info");
            fetchPlaceInfo();
            break;
        case (testFiles.place_full_info) :
            console.log("push the data to airtable");
            break;
        default: 
            console.log("fetch google from sample - create place_id.json - create place_full_info.json - push the data to airtable");
            fullProcedure();
            break;
    }
});

return;

