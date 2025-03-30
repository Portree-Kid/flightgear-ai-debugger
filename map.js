// generates a key from the item's coordinates.
function keyFor (item) {
  return item.geometry.coordinates[0] + ':' + item.geometry.coordinates[1];
}

function removeDuplicates (arr) {
  // index the entries by their coordinates such that
  // indexed['lat:lng'] == the entry.
  var indexed = {};  
  if (arr.features==undefined)
    return;
  arr.features.forEach(function (item) {
    // a duplicate key will replace the existing entry
    indexed[keyFor(item)] = item;
  });

  // turn the results back into an array of just values.
  var result = Object.keys(indexed).map(function (k) {
    return indexed[k];
  });
  return result;
}

function latLngToTurf (turfPoint) {
  return [turfPoint.decimalLongitude, turfPoint.decimalLatitude];
}

function turfToLatLng (turfPoint) {
  return [turfPoint.geometry.coordinates[1].toFixed(6), turfPoint.geometry.coordinates[0].toFixed(6)];
}

var myStyleWPS = {
  "color": "#ff0000",
  "weight": 5,
  "opacity": 0.65
};

var myStyleAircraft = {
  "color": "#00ff00",
  "weight": 5,
  "opacity": 0.65
};

var geojsonMarkerOptionsWPS = {
  radius: 5,
  fillColor: "#ff0000",
  color: "#000",
  weight: 1,
  opacity: 1,
  fillOpacity: 0.8
};

var geojsonMarkerOptions = {
  radius: 5,
  fillColor: "#ff7800",
  color: "#000",
  weight: 1,
  opacity: 1,
  fillOpacity: 0.8
};

//require('leaflet');
require('leaflet-easybutton');

window.onload = function (e) {
  initMap();
}

var pointerLayer;

var wpLayer;
var aircraftLayer;
var sidebar;

var pointIndex = 0;
var mymap;

function initMap () {
  require('leaflet-sidebar-v2');
  const mapDiv = document.getElementById("mapid");
  console.log(mapDiv);
  mymap = L.map(mapDiv);
  try {
    var mapCenter = JSON.parse(window.localStorage['mapView']);
    mymap.setView([mapCenter.lat, mapCenter.lng], mapCenter.zoom);
  } catch (error) {
    mymap.setView([-33.9456200282, 151.167449999], 15);
  }
  mymap.on("moveend", function (e) {
    var view = {
      lat: mymap.getCenter().lat,
      lng: mymap.getCenter().lng,
      zoom: mymap.getZoom()
    };
    window.localStorage['mapView'] = JSON.stringify(view);
  });

  const resizeObserver = new ResizeObserver(() => {
    mymap.invalidateSize();
  });

  resizeObserver.observe(mapDiv);

  var OpenStreetMap_Mapnik = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  });
  OpenStreetMap_Mapnik.addTo(mymap);
  /*
    L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoicG9ydHJlZWtpZCIsImEiOiJja3J2MHRoMWUwMjNhMnhydjU4YWZ6M2NlIn0.FhO4Ws1SHJbPMUFIa6UZVw', {
    maxZoom: 24,
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, ' +
      'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    id: 'mapbox/streets-v11',
    tileSize: 512,
    zoomOffset: -1
  }).addTo(mymap);
  */

  const backend = require('./backend');

  pointerLayer = L.layerGroup().addTo(mymap);

  wpLayer = L.layerGroup().addTo(mymap);
  aircraftLayer = L.layerGroup().addTo(mymap);

  var layers = { "Waypoints": wpLayer, "Aircraft": aircraftLayer };
  L.control.layers({}, layers).addTo(mymap);

  // Sidebar   
  sidebar = L.control.sidebar({
    autopan: true,       // whether to maintain the centered map point when opening the sidebar
    closeButton: true,    // whether t add a close button to the panes
    container: 'sidebar', // the DOM container or #ID of a predefined sidebar container that should be used
    position: 'left',     // left or right
  }).addTo(mymap);
  sidebar.on('content', function (e) {
    console.log(e.target);

    backend.listFiles().then(files => {
      var innerHTML = files.filter(f => f.indexOf(filterValue) >= 0).map(f => `<A onclick="openFile('${f}')" href="#">${f}</A><BR>`).reduce((prev, curr) => prev + curr);
      console.log(innerHTML);
      if (sidebar.getContainer().getElementsByClassName('files-content').length > 0) {
        sidebar.getContainer().getElementsByClassName('files-content')[0].innerHTML =
          innerHTML;
      }
      console.log(sidebar.getContainer().getElementsByClassName('files-content'));
    });
  })
  L.easyButton('fa-step-backward', function (btn, map) {
    pointIndex-=10;
    console.log(aircraftLayer.getLayer(pointIndex));
  }).addTo(mymap);
  L.easyButton('fa-step-forward', function (btn, map) {
    pointIndex+=10;
    aircraftLayer.getLayers()[0].eachLayer(function(l){
      if (pointIndex==Number(l.feature.properties.Index)) {
        mymap.setView(l.getLatLng(), mymap.getZoom());
        console.log(l);
      }
  });
    console.log();
  }).addTo(mymap);
}

exports.readFile = function (filename) {
  const backend = require('./backend');
  wpLayer.clearLayers();
  backend.wps(filename, (err, data) => {
    console.log(data);
    //var wpsJSON = JSON.parse(data);
    var g = L.geoJson(removeDuplicates(data), {
      pointToLayer: function (feature, latlng) {
        return L.circleMarker(latlng, geojsonMarkerOptionsWPS).bindTooltip(feature.properties);
      }
    }).addTo(wpLayer);    
    mymap.fitBounds(g.getBounds());
  }
  );
  aircraftLayer.clearLayers();
  backend.aircraft(filename, (err, data) => {
    L.geoJson(removeDuplicates(data), {
      pointToLayer: function (feature, latlng) {
        //        console.log(feature.properties);
        var dist = L.latLng(latlng).distanceTo([feature.properties['WP Lat'], feature.properties['WP Lon']]);
        var aircraft = L.circleMarker(latlng, geojsonMarkerOptions).bindTooltip(
          feature.properties.Name + "<BR>" +
          "DistToGo : " + Math.round(feature.properties.dist_to_go_m * 1000) / 1000 + "<BR>" +
          "Speed : " + Math.round(feature.properties.speed * 1000) / 1000 + "<BR>" +
          "TGT Speed : " + Math.round(feature.properties.tgt_speed * 1000) / 1000 + "<BR>"
        );
        aircraft.on("click", event => {
          console.log(feature.properties);
          pointerLayer.clearLayers();
          var polyline = L.polyline([latlng, [feature.properties['WP Lat'], feature.properties['WP Lon']]], { color: 'red', interactive: false }).addTo(pointerLayer);
          var point = turf.point([Number(latlng.lng), Number(latlng.lat)]);
          var distance = Number(feature.properties.dist_to_go_m) / 1000;
          var bearing = Number(feature.properties.hdg);
          var options = { units: 'kilometers' };
          // turf.point([Number(latlng.lng), Number(latlng.lat)]), Number(feature.properties.speed), Number(feature.properties.heading)
          var point2 = turf.destination(point, distance, bearing, options);
          L.polyline([turfToLatLng(point), turfToLatLng(point2)], { color: 'green', interactive: false }).addTo(pointerLayer);
          var leaddistance = Number(feature.properties.Leaddistance) / 3000;
          var leadPoint = turf.destination(point, leaddistance, bearing, options);
          L.polyline([turfToLatLng(point), turfToLatLng(leadPoint)], { color: 'yellow', interactive: false }).addTo(pointerLayer);
          /* remove a panel */
          sidebar.open('pointinfo');
          sidebar.getContainer().getElementsByClassName('pointinfo-content')[0].innerHTML
            = getHTML(feature.properties);
        });
        return aircraft;
      }
    }).addTo(aircraftLayer);
  });
}

function getHTML (properties) {
  var innerHTML = "<ul>";
  for (const [key, value] of Object.entries(properties)) {
    console.log(`${key}: ${value}`);
    innerHTML += `<li>${key}: ${value}</li>`
  }
  return innerHTML + "</ul>";
}
