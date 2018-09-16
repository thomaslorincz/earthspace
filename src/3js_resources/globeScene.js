import { setEvents } from '../common/setEvent';
import {getEventCenter, geodecoder, getPoint} from '../common/geoHelpers';
import { mapTexture } from '../common/mapTexture';
import { memoize } from '../common/utils';
import { getTween } from '../common/utils';
import { feature as topojsonFeature } from 'topojson';
import * as d3 from 'd3';
import * as satellite from "../common/satellite/dist/satellite.js";
import * as GLTFExporter from "./threeLibs/exporters/GLTFExporter.js";

const config = {
  apiKey: "AIzaSyBefB9lyQ_tGXWEwOHOcHFdL7muV3WDAfI",
  authDomain: "earth-space.firebaseapp.com",
  databaseURL: "https://earth-space.firebaseio.com",
  projectId: "earth-space",
  storageBucket: "earth-space.appspot.com",
  messagingSenderId: "425899929938"
};
var firebase = require('firebase');
var db = firebase.initializeApp(config).database();

var userId = 'kglKBU0GOBaRaLrwFUCsUyZHY073';

var scene = null;

export default class globeScene {
  constructor() {
    this.camera = null;
    this.currentCamState = 3;
    this.cameraController = null;
    this.scene = null;
    this.renderer = null;
    this.controls = null;
    this.earthMesh = null;
    this.choroplethEarth = null;
    this.countryMap = null;
    this.currentCountry = null;
    this.overlay = null;
    this.textureCache = null;
    this.geo = null;
    this.satelliteRefs = {};
    this.planeRefs = {};
  }

  init() {
    const container = document.createElement('div');
    document.getElementById('earth').appendChild(container);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
    this.camera.position.z = 1000;
    this.cameraController = new THREE.Object3D();
    this.cameraController.add(this.camera);

    scene = new THREE.Scene();
    scene.add(this.cameraController);

    this.renderer = new THREE.WebGLRenderer({antialiasing : true});
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(this.renderer.domElement);

    // setup controls and rerender when controlling to avoid frame lag
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.autoRotate = true;
    this.controls.enableKeys = false;
    this.controls.addEventListener('change', () => this.render());

    scene.background = new THREE.TextureLoader().load('/src/3js_resources/textures/milk_backg.jpg');

    window.addEventListener('resize', () => this.onWindowResize(), false);

    d3.json('../../data/world.json').then((data) => {
      const segments = 40; // number of vertices. Higher = better mouse accuracy

      // Setup cache for country textures
      const countries = topojsonFeature(data, data.objects.countries);

      this.geo = geodecoder(countries.features);
      this.textureCache = memoize((id, color) => {
        const country = this.geo.find(id);
        return mapTexture(country, color);
      });

      let oceanMaterial = new THREE.MeshBasicMaterial();
      oceanMaterial.map = new THREE.TextureLoader().load('/src/3js_resources/textures/earth_low.jpg');
      let sphere = new THREE.SphereGeometry(455, segments, segments);
      this.earthMesh = new THREE.Mesh(sphere, oceanMaterial);
      this.earthMesh.rotation.y = Math.PI;
      this.earthMesh.addEventListener('mousemove', (e) => this.onGlobeMouseMove(e, this.earthMesh));
      this.earthMesh.addEventListener('click', (e) => this.onGlobeClick(e, this.earthMesh));

      // add base map layer with all countries
      let worldTexture = mapTexture(countries, '#000000');
      let mapMaterial  = new THREE.MeshBasicMaterial({map: worldTexture, transparent: true, opacity: 0.9});
      let baseMap = new THREE.Mesh(new THREE.SphereGeometry(456, segments, segments), mapMaterial);
      baseMap.rotation.y = Math.PI;
      // baseMap.addEventListener('mousemove', (e) => this.onGlobeMousemove(e));

      scene.add(this.earthMesh);
      scene.add(baseMap);
      setEvents(this.camera, [this.earthMesh], 'mousemove', 10);
      setEvents(this.camera, [this.earthMesh], 'click', 10);
      /*
      var loader = new THREE.JSONLoader();
      var test = loader.load('/src/3js_resources/sat.json', function(geometry, materials) {
          var cube_sat = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial(materials));
      cube_sat.scale.x = cube_sat.scale.y = cube_sat.scale.z = 0.4;		
      scene.add( cube_sat );
      });
      console.log(test);
      scene = scene;*/
      // var data = firebase.database().ref('satellites');
      // data.on('value', snapshot => {
      //   setInterval(() => satelliteHandler(snapshot, scene, this.satelliteRefs), 10000);
      // });
      
      var satData = firebase.database().ref('satellites');
      setInterval(() => satData.on('value', snapshot => {
        serverSatHandle(snapshot, scene, this.satelliteRefs);
      }), 10000);
      /*
      var planeData = firebase.database().ref('planes');
      setInterval(() => planeData.on('value', snapshot => {
        planeHandle(snapshot, scene, this.planeRefs);
      }), 20000);*/
    });
  }

  exportSceneGLB() {
    var exporter = new THREE.GLTFExporter();

		exporter.parse( scene, function ( result ) {

			saveArrayBuffer( result, 'scene.glb' );

			// forceIndices: true, forcePowerOfTwoTextures: true
			// to allow compatibility with facebook
		}, { binary: true, forceIndices: true, forcePowerOfTwoTextures: true } );
  }

  distanceBetween(point1, point2) {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    const dz = point2.z - point1.z;
    return Math.sqrt((dx*dx) + (dy*dy) + (dz*dz));
  }

  latLongToCoords(latitude, longitude, radius) {
    const phi   = (90-latitude)*(Math.PI/180);
    const theta = (longitude+180)*(Math.PI/180);

    const x = -((radius) * Math.sin(phi)*Math.cos(theta));
    const y = ((radius) * Math.cos(phi));
    const z = ((radius) * Math.sin(phi)*Math.sin(theta));

    return {x:x,y:y,z:z};
  }

  onGlobeClick(event, baseGlobe) {
    // Get pointc, convert to latitude/longitude
    this.exportSceneGLB();
    const latlng = this.getEventCenter(baseGlobe, event, 456);

    // Look for country at that latitude/longitude
    const country = this.geo.search(latlng[0], latlng[1]);

    if (!country) {
      this.controls.autoRotate = true;
      return;
    }

    // Get new camera position
    var temp = new THREE.Mesh();
    var returnCoords = this.convertToXYZ(latlng[0], latlng[1], 900);
    temp.position.set(returnCoords.x, returnCoords.y, returnCoords.z);
    temp.lookAt(baseGlobe.position);
    temp.rotateY(Math.PI);

    for (let key in temp.rotation) {
      if (temp.rotation[key] - this.camera.rotation[key] > Math.PI) {
        temp.rotation[key] -= Math.PI * 2;
      } else if (this.camera.rotation[key] - temp.rotation[key] > Math.PI) {
        temp.rotation[key] += Math.PI * 2;
      }
    }

    this.controls.autoRotate = false;
    //var tweenPos = this.getTween(this.camera, 'position', temp.position, baseGlobe);
    var tweenPos = getTween.call(this.camera, 'position', temp.position);
    d3.timer(tweenPos);

    //var tweenRot = this.getTween(this.camera, 'rotation', temp.rotation, baseGlobe);
    var tweenRot = getTween.call(this.camera, 'rotation', temp.rotation);
    d3.timer(tweenRot);
  }

  onGlobeMouseMove(event, baseGlobe) {
    let map;
    let material;

    // Get pointc, convert to latitude/longitude
    const latlng = this.getEventCenter(baseGlobe, event, 456);

    // Look for country at that latitude/longitude
    const country = this.geo.search(latlng[0], latlng[1]);

    if (country !== null && country.code !== this.currentCountry) {

      // Track the current country displayed
      this.currentCountry = country.code;

      // Update the html
      d3.select('#toolbar').node().innerText = country.code;

      // Overlay the selected country
      map = this.textureCache(country.code, '#3B3B3B');
      material = new THREE.MeshBasicMaterial({map: map, transparent: true});
      if (!this.overlay) {
        this.overlay = new THREE.Mesh(new THREE.SphereGeometry(458, 40, 40), material);
        this.overlay.rotation.y = Math.PI;
        scene.add(this.overlay);
      } else {
        this.overlay.material = material;
      }
    }
  }

  onZoomSample(newZoomState) {
    //console.log(newZoomState);
  }

  convertToXYZ(lat, long, radius) {
    radius = radius || 200;
  
    var latRads = ( 90 - lat) * Math.PI / 180;
    var lngRads = (180 - long) * Math.PI / 180;
  
    var x = radius * Math.sin(latRads) * Math.cos(lngRads);
    var y = radius * Math.cos(latRads);
    var z = radius * Math.sin(latRads) * Math.sin(lngRads);
    
    return {x: x, y: y, z: z};
  }

  getEventCenter(globe, event, radius) {
    radius = radius || 200;

    var point = this.getPoint(globe, event);

    var latRads = Math.acos(point.y / radius);
    var lngRads = Math.atan2(point.z, point.x);
    var lat = (Math.PI / 2 - latRads) * (180 / Math.PI);
    var lng = (Math.PI - lngRads) * (180 / Math.PI);

    return [lat, lng - 180];
  }

  getPoint(globe, event) {
    // Get the vertices
    let a = globe.geometry.vertices[event.face.a];
    let b = globe.geometry.vertices[event.face.b];
    let c = globe.geometry.vertices[event.face.c];

    return {
      x: (a.x + b.x + c.x) / 3,
      y: (a.y + b.y + c.y) / 3,
      z: (a.z + b.z + c.z) / 3
    };
  }

  cameraDistanceCheck() {
    var currentDist = this.distanceBetween(this.camera.position, new THREE.Vector3(0,0,0));
    var calculatedCamState = 3;
    if (currentDist > 800) {
      calculatedCamState = 3;
    } else if (currentDist > 600) {
      calculatedCamState = 2;
    } else {
      calculatedCamState = 1;
    }
    return calculatedCamState;
  }

  // responsively resize 3js canvas to window size
  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    window.requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.render();
    //console.log(this.distanceBetween(this.camera.position,this.earthMesh.position));
    var refLastCamState = this.currentCamState;
    this.currentCamState = this.cameraDistanceCheck();
    if (this.currentCamState != refLastCamState) {
      this.onZoomSample(this.currentCamState);
    }
  }

  render() {
    this.renderer.clear();
    this.renderer.render(scene, this.camera);
  }
}

function latLongToCoords(latitude, longitude, radius) {
  const phi   = (90-latitude)*(Math.PI/180);
  const theta = (longitude+180)*(Math.PI/180);

  const x = -((radius) * Math.sin(phi)*Math.cos(theta));
  const y = ((radius) * Math.cos(phi));
  const z = ((radius) * Math.sin(phi)*Math.sin(theta));

  return {x:x,y:y,z:z};
}

function satelliteHandler(snapshot, scene, satelliteRefs) { 
  var satellites = snapshot.val();
  for(var key in satellites){
    if(satellites.hasOwnProperty(key)){
      if(typeof satellites[key]['tle']['0'] === 'undefined' || typeof satellites[key]['tle']['1'] === 'undefined') continue;
      var tleArray = ['',''];
      tleArray[0] = satellites[key]['tle']['0'];
      tleArray[1] = satellites[key]['tle']['1'];
      var lat = '';
      var lng = '';
      var altitude = 0;
       
        // Initialize a satellite record
        var satrec = satellite.twoline2satrec(tleArray[0], tleArray[1]);
        
        //  Or you can use a JavaScript Date
        var positionAndVelocity = satellite.propagate(satrec, new Date());
        
        // The position_velocity result is a key-value pair of ECI coordinates.
        // These are the base results from which all other coordinates are derived.
        var positionEci = positionAndVelocity.position,
            velocityEci = positionAndVelocity.velocity;
        
        var deg2rad = Math.PI/180;
        // Set the Observer at 122.03 West by 36.96 North, in RADIANS
        var observerGd = {
            longitude: -122.0308 * deg2rad,
            latitude: 36.9613422 * deg2rad,
            height: 0.370
        };
        
        //You will need GMST for some of the coordinate transforms.
        //http://en.wikipedia.org/wiki/Sidereal_time#Definition
        var gmst = satellite.gstimeFromDate(new Date());
        
        //You can get ECF, Geodetic, Look Angles, and Doppler Factor.
        var positionEcf   = satellite.eciToEcf(positionEci, gmst),
            positionGd    = satellite.eciToGeodetic(positionEci, gmst);
        
        // Geodetic coords are accessed via `longitude`, `latitude`, `height`.
        var longitude = positionGd.longitude,
          latitude  = positionGd.latitude,
          height    = positionGd.height;
        
        //  Convert the RADIANS to DEGREES for pretty printing (appends "N", "S", "E", "W", etc).
        var longitudeStr = satellite.degreesLong(longitude),
          latitudeStr  = satellite.degreesLat(latitude);
            
        var satRec = {latitude : latitudeStr, longitude : longitudeStr, altitude : height};
        //var loader = new THREE.JSONLoader();
        //loader.load('/src/3js_resources/Satellite.json', function(geometry, materials) {
            //var satModel = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial('#EEEEEE'));
        //satModel.scale.x = satModel.scale.y = satModel.scale.z = 1;		
        //this.satelliteRefs[satellites[key].norad : satModel];
        //scene.add( satModel );
        //});

        var location = latLongToCoords(satellites[key]['satRec'].latitude, satellites[key]['satRec'].longitude, 500);
        
        if (!(satellites[key].norad in satelliteRefs)) {
          var satModel = new THREE.Mesh(new THREE.CubeGeometry(0.5,0.5,0.5), new THREE.MeshBasicMaterial('#EEEEEE'));
          satModel.scale.x = satModel.scale.y = satModel.scale.z = 1;		
          satelliteRefs[satellites[key].norad] = satModel;
          satelliteRefs[satellites[key].norad] = copyVector(satModel, location);
          scene.add( satModel );
        } else {
          satelliteRefs[satellites[key].norad] = copyVector(satelliteRefs[satellites[key].norad], location);
        }
    }
  }
}

function planeHandle(snapshot, scene, planeRefs) {
  var planes = snapshot.val();
  for(var key in planes) {
    if(planes.hasOwnProperty(key)) {
      var targetLoc = latLongToCoords(planes[key].lat, planes[key].lon, 450 + (planes[key].alt/1000));
      if (!(key in planeRefs)) {
        var planeModel = new THREE.Mesh(new THREE.CubeGeometry(0.5,0.5,0.5), new THREE.MeshBasicMaterial('#EEEEEE'));
        planeModel.scale.x = planeModel.scale.y = planeModel.scale.z = 2;		
        planeRefs[planes[key].norad] = planeModel;
        planeRefs[planes[key].norad] = copyVector(planeModel, location);
        scene.add( planeModel );
      } else {
        planeRefs[planes[key].norad] = copyVector(planeRefs[planes[key].norad], location);
      }
    }
  }
}

function serverSatHandle(snapshot, scene, satelliteRefs) {
  var satellites = snapshot.val();
  var loader = new THREE.JSONLoader();
  loader.load('/src/3js_resources/sat.json', function(geometry) {
  for(var key in satellites){
    if(satellites.hasOwnProperty(key)){
      var location = latLongToCoords(satellites[key]['satRec'].latitude, satellites[key]['satRec'].longitude, 600 + satellites[key]['satRec'].altitude/100);
      if (!(satellites[key].norad in satelliteRefs)) {
        // var satModel = new THREE.Mesh(new THREE.CubeGeometry(0.5,0.5,0.5), new THREE.MeshBasicMaterial('#EEEEEE'));
        // satModel.scale.x = satModel.scale.y = satModel.scale.z = 2;		
        // satelliteRefs[satellites[key].norad] = satModel;
        // satelliteRefs[satellites[key].norad] = copyVector(satModel, location);
        // scene.add( satModel );
        var satModel = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial('#EEEEEE'));
        satModel.scale.x = satModel.scale.y = satModel.scale.z = 0.2;	
        satModel.rotation.x;
        satModel = copyVector(satModel, location);	
        satelliteRefs[satellites[key].norad] = satModel;
        scene.add( satModel );
      } else {
        satelliteRefs[satellites[key].norad] = copyVector(satelliteRefs[satellites[key].norad], location);
      }
    }
  }
  });
}

function convertCoordToXYZ(lat, long, radius) {
  radius = radius || 200;

  var latRads = ( 90 - lat) * Math.PI / 180;
  var lngRads = (180 - long) * Math.PI / 180;

  var x = radius * Math.sin(latRads) * Math.cos(lngRads);
  var y = radius * Math.cos(latRads);
  var z = radius * Math.sin(latRads) * Math.sin(lngRads);
  
  return {x: x, y: y, z: z};
}

function copyVector(object, vector2) {
  object.position.x = vector2.x;
  object.position.y = vector2.y;
  object.position.z = vector2.z;
  return object;
}

var link = document.createElement( 'a' );
link.style.display = 'none';
document.body.appendChild( link ); // Firefox workaround, see #6594

function save( blob, filename ) {

  link.href = URL.createObjectURL( blob );
  link.download = filename || 'data.json';
  link.click();
}

function saveArrayBuffer( buffer, filename ) {

  //save( new Blob( [ buffer ], { type: 'application/octet-stream' } ), filename );
  const fs = require('fs');
  var path = require('path');
  //fs.appendFile(path.join(__dirname, 'scene.glb'),new Buffer(buffer));
  var ie_writeFile = function (filename, buffer) {
    var fso, fileHandle;
    fso = new ActiveXObject("Scripting.FileSystemObject");
    fileHandle = fso.CreateTextFile("c:\test.glb", true);
    fileHandle.write(data);
    fileHandle.close();
  };
}