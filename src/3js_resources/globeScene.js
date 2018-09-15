import { setEvents } from '../common/setEvent';
import {getEventCenter, geodecoder, getPoint} from '../common/geoHelpers';
import { mapTexture } from '../common/mapTexture';
import { memoize } from '../common/utils';
import { getTween } from '../common/utils';
import { feature as topojsonFeature } from 'topojson';
import * as d3 from 'd3';

export default class globeScene {
  constructor() {
    this.camera = null;
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
  }

  init() {
    const container = document.createElement('div');
    document.getElementById('earth').appendChild(container);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
    this.camera.position.z = 1000;
    this.cameraController = new THREE.Object3D();
    this.cameraController.add(this.camera);

    this.scene = new THREE.Scene();
    this.scene.add(this.cameraController);

    this.renderer = new THREE.WebGLRenderer({antialiasing : true});
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(this.renderer.domElement);

    // setup controls and rerender when controlling to avoid frame lag
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.autoRotate = true;
    this.controls.enableKeys = false;
    this.controls.addEventListener('change', () => this.render());

    // EARTH
    // let earthGeo = new THREE.SphereGeometry (455, 400, 400);
    // let earthMat = new THREE.MeshBasicMaterial();
    // earthMat.map = new THREE.TextureLoader().load('/src/3js_resources/textures/earth_lightsBW.jpg');

    // this.earthMesh = new THREE.Mesh(earthGeo, earthMat);
    // this.earthMesh.position.set(0, 0, 0);
    // this.scene.add(this.earthMesh);

    this.scene.background = new THREE.TextureLoader().load('/src/3js_resources/textures/milk_backg.jpg');

    window.addEventListener('resize', () => this.onWindowResize(), false);

    d3.json('../../data/world.json').then((data) => {
      const segments = 155; // number of vertices. Higher = better mouse accuracy

      // Setup cache for country textures
      const countries = topojsonFeature(data, data.objects.countries);

      this.geo = geodecoder(countries.features);
      this.textureCache = memoize((id, color) => {
        const country = this.geo.find(id);
        return mapTexture(country, color);
      });

      let oceanMaterial = new THREE.MeshBasicMaterial();
      oceanMaterial.map = new THREE.TextureLoader().load('/src/3js_resources/textures/earth_lightsBW.jpg');
      let sphere = new THREE.SphereGeometry(455, segments, segments);
      let baseGlobe = new THREE.Mesh(sphere, oceanMaterial);
      baseGlobe.rotation.y = Math.PI;
      baseGlobe.addEventListener('mousemove', (e) => this.onGlobeMouseMove(e, baseGlobe));
      baseGlobe.addEventListener('click', (e) => this.onGlobeClick(e, baseGlobe));

      // add base map layer with all countries
      let worldTexture = mapTexture(countries, '#000000');
      let mapMaterial  = new THREE.MeshBasicMaterial({map: worldTexture, transparent: true, opacity: 0.9});
      let baseMap = new THREE.Mesh(new THREE.SphereGeometry(456, segments, segments), mapMaterial);
      baseMap.rotation.y = Math.PI;
      // baseMap.addEventListener('mousemove', (e) => this.onGlobeMousemove(e));

      this.scene.add(baseGlobe);
      this.scene.add(baseMap);
      setEvents(this.camera, [baseGlobe], 'mousemove', 10);
      setEvents(this.camera, [baseGlobe], 'click', 10);
    });
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

    return [x,y,z];
  }

  onGlobeClick(event, baseGlobe) {
    // Get pointc, convert to latitude/longitude
    const latlng = this.getEventCenter(baseGlobe, event, 456);

    // Look for country at that latitude/longitude
    const country = this.geo.search(latlng[0], latlng[1]);

    if (!country) {
      this.controls.autoRotate = true;
      return;
    }

    // Get new camera position
    var temp = new THREE.Mesh();
    var returnCoords = this.convertToXYZ(latlng, 900);
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
        this.scene.add(this.overlay);
      } else {
        this.overlay.material = material;
      }
    }
  }

  convertToXYZ(point, radius) {
    radius = radius || 200;
  
    var latRads = ( 90 - point[0]) * Math.PI / 180;
    var lngRads = (180 - point[1]) * Math.PI / 180;
  
    var x = radius * Math.sin(latRads) * Math.cos(lngRads);
    var y = radius * Math.cos(latRads);
    var z = radius * Math.sin(latRads) * Math.sin(lngRads);
    
    return {x: x, y: y, z: z};
  }
/*
  getTween(prop, to, dest, globe) {
    var time = dest.length || 500;
    var node = this;
    var interpol = d3.interpolateObject(prop.camera, globe);
    return function (t) {
      if (t >= time) {
        console.log("Done")
        return true;
      } else {
        console.log(t);
        node[prop] = interpol(t / time);
      }
    };
  };*/

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
    // console.log(this, event);
    let a = globe.geometry.vertices[event.face.a];
    let b = globe.geometry.vertices[event.face.b];
    let c = globe.geometry.vertices[event.face.c];

    return {
      x: (a.x + b.x + c.x) / 3,
      y: (a.y + b.y + c.y) / 3,
      z: (a.z + b.z + c.z) / 3
    };
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
  }

  render() {
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
  }
}