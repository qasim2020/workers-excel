console.log("APP STARTED");

const Airtable = require('airtable');
const readXlsxFile = require('read-excel-file/node');

var env = process.env.NODE_ENV || 'development';

if (env === 'development' || env === 'test') {
  var config = require('./config.json');
  var envConfig = config[env];
  Object.keys(envConfig).forEach((key) => {
    process.env[key] = envConfig[key];
  });
}

var base = new Airtable({apiKey: process.env.Airtable}).base('appw495hZQOZZHnQO');

let array = [];

let getNumber = function(val) {

    val.splice(0,4);
    let string = val.toString().replace(/\s/g, "");
    let output = string.match(/[0-9]{5,}/g);
    return output && output.toString();

};

// travel_agency.xlsx DONE
// solar_panels.xlsx  DONE
// security_cameras.xlsx DONE
// gift_boxes.xlsx DONE
// cakes_bakes.xlsx

readXlsxFile('cakes_bakes.xlsx').then( rows => {
    let obj = rows.map( val => {
        return {
            fields: {
                URL: val[0], 
                Business: val[1],
                Rating: Math.floor( Number(val[2]) ), 
                Reviews: val[3], 
                "Google Type": val[5], 
                Desc: `${val[6]} ${val[7]} ${val[8]} ${val[9]} ${val[10]}`, 
                Number: getNumber( val ),
                "Custom Type": "Cakes & Bakes"
            }
        }
    }).filter( val => val.fields.Number && val.fields.Number.length > 0 );

    console.log( JSON.stringify( obj, 0, 2 ) );
    console.log( obj.length );
    // return console.log("here verify if data is good, push to airtable"); console.log("APP ENDED"); console.log(" ---- " );

    obj.forEach( (val, index)  => {
        base('Shields').create([ val ], {typecast: true}, function(err, records) {
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
