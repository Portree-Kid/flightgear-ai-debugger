const fs = require('fs');
const path = require('path');
const csv2geojson = require('csv2geojson');
const dir = 'W:\\';

exports.aircraft = function (filename, cb) {
    console.log(filename);
    const csvString = fs.readFileSync(path.join(dir, filename), 'utf8');

    csv2geojson.csv2geojson(csvString, {
      delimiter: 'auto'
    },
      cb)
};
exports.wps = function (filename, cb) {
    console.log(filename);
    const csvString = fs.readFileSync(path.join(dir, filename), 'utf8');

    csv2geojson.csv2geojson(csvString, {
      latfield: 'WP Lat',
      lonfield: 'WP Lon',
      delimiter: 'auto'
    },
      cb)
};
exports.listFiles = async function () {
  var files = fs.readdirSync(dir).map(function (fileName) {
    var time = 1000000000;
    try {
      time = fs.statSync(dir + '/' + fileName).mtime.getTime();
    } catch (err) {
      console.log(err);
    }
    return {
      name: fileName,
      time: time
    };
  })
    .sort(function (a, b) { return - a.time + b.time; })
    .map(function (v) { return v.name; })
    .filter(n => n.includes('csv'));
  return files;
};

