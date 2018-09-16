import { setEvents } from '../common/setEvent';
import { mapTexture } from '../common/mapTexture';
import { memoize } from '../common/utils';
import { getTween } from '../common/utils';
import { feature as topojsonFeature } from 'topojson';
import * as d3 from 'd3';
import { geodecoder } from "../common/geoHelpers";

export default class globeScene {
  constructor() {
    this.camera = null;
    this.cameraController = null;
    this.scene = null;
    this.renderer = null;
    this.controls = null;
    this.currentCountry = null;
    this.overlay = null;
    this.textureCache = {};
    this.geo = null;
    this.countries = null;
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

    this.scene.background = new THREE.TextureLoader().load('/src/3js_resources/textures/milk_backg.jpg');

    window.addEventListener('resize', () => this.onWindowResize(), false);

    d3.json('../../data/world.json').then((data) => {
      const segments = 155; // number of vertices. Higher = better mouse accuracy

      // Setup cache for country textures
      this.countries = topojsonFeature(data, data.objects.countries);

      this.geo = geodecoder(this.countries.features);
      this.textureCache = memoize((id) => {
        const country = this.geo.find(id);
        return mapTexture(country);
      });

      let oceanMaterial = new THREE.MeshBasicMaterial();
      oceanMaterial.map = new THREE.TextureLoader().load('/src/3js_resources/textures/earth_lightsBW.jpg');
      let sphere = new THREE.SphereGeometry(455, segments, segments);
      let baseGlobe = new THREE.Mesh(sphere, oceanMaterial);
      baseGlobe.rotation.y = Math.PI;
      baseGlobe.addEventListener('mousemove', (e) => this.onGlobeMouseMove(e, baseGlobe));
      baseGlobe.addEventListener('click', (e) => this.onGlobeClick(e, baseGlobe));

      // add base map layer with all countries
      let worldTexture = mapTexture(this.countries);
      let mapMaterial  = new THREE.MeshBasicMaterial({map: worldTexture, transparent: true, opacity: 0.2});
      let baseMap = new THREE.Mesh(new THREE.SphereGeometry(456, segments, segments), mapMaterial);
      baseMap.rotation.y = Math.PI;

      this.scene.add(baseGlobe);
      this.scene.add(baseMap);
      setEvents(this.camera, [baseGlobe], 'mousemove', 10);
      setEvents(this.camera, [baseGlobe], 'click', 10);
    });
  }

  choropleth(dataMap, min, max) {
    // add base map layer with all countries
    let worldTexture = mapTexture(this.countries, dataMap, min, max);
    let mapMaterial  = new THREE.MeshBasicMaterial({map: worldTexture, transparent: true, opacity: 0.8});
    let baseMap = new THREE.Mesh(new THREE.SphereGeometry(458, 155, 155), mapMaterial);
    baseMap.rotation.y = Math.PI;

    this.scene.add(baseMap);
  }

  onGlobeClick(event, baseGlobe) {
    // Get point, convert to latitude/longitude
    const latlng = this.getEventCenter(baseGlobe, event, 456);

    // Look for country at that latitude/longitude
    const country = this.geo.search(latlng[0], latlng[1]);

    if (!country) {
      this.controls.autoRotate = true;
      document.getElementById('selection').innerText = 'No selection';
      return;
    }

    document.getElementById('selection').innerText = country.code;

    // Get new camera position
    let temp = new THREE.Mesh();
    const returnCoords = this.convertToXYZ(latlng, 900);
    temp.position.set(returnCoords.x, returnCoords.y, returnCoords.z);
    temp.lookAt(baseGlobe.position);
    temp.rotateY(Math.PI);

    for (let key in temp.rotation) {
      if (!temp.rotation.hasOwnProperty(key)) {
        continue;
      }
      if (temp.rotation[key] - this.camera.rotation[key] > Math.PI) {
        temp.rotation[key] -= Math.PI * 2;
      } else if (this.camera.rotation[key] - temp.rotation[key] > Math.PI) {
        temp.rotation[key] += Math.PI * 2;
      }
    }

    this.controls.autoRotate = false;
    const tweenPos = getTween.call(this.camera, 'position', temp.position);
    d3.timer(tweenPos);

    const tweenRot = getTween.call(this.camera, 'rotation', temp.rotation);
    d3.timer(tweenRot);
  }

  onGlobeMouseMove(event, baseGlobe) {
    let map;
    let material;

    // Get point, convert to latitude/longitude
    const latlng = this.getEventCenter(baseGlobe, event, 456);

    // Look for country at that latitude/longitude
    const country = this.geo.search(latlng[0], latlng[1]);

    if (country !== null && country.code !== this.currentCountry) {
      // Track the current country displayed
      this.currentCountry = country.code;

      // Overlay the selected country
      map = this.textureCache(country.code);
      material = new THREE.MeshBasicMaterial({map: map, transparent: true});
      console.log(map, material);
      if (!this.overlay) {
        this.overlay = new THREE.Mesh(new THREE.SphereGeometry(460, 40, 40), material);
        this.overlay.rotation.y = Math.PI;
        this.scene.add(this.overlay);
      } else {
        this.overlay.material = material;
      }
    }
  }

  convertToXYZ(point, radius) {
    radius = radius || 200;

    const latRads = (90 - point[0]) * Math.PI / 180;
    const lngRads = (180 - point[1]) * Math.PI / 180;

    const x = radius * Math.sin(latRads) * Math.cos(lngRads);
    const y = radius * Math.cos(latRads);
    const z = radius * Math.sin(latRads) * Math.sin(lngRads);

    return {x: x, y: y, z: z};
  }

  getEventCenter(globe, event, radius) {
    radius = radius || 200;

    const point = this.getPoint(globe, event);

    const latRads = Math.acos(point.y / radius);
    const lngRads = Math.atan2(point.z, point.x);
    const lat = (Math.PI / 2 - latRads) * (180 / Math.PI);
    const lng = (Math.PI - lngRads) * (180 / Math.PI);

    return [lat, lng - 180];
  }

  getPoint(globe, event) {
    const a = globe.geometry.vertices[event.face.a];
    const b = globe.geometry.vertices[event.face.b];
    const c = globe.geometry.vertices[event.face.c];

    return {
      x: (a.x + b.x + c.x) / 3,
      y: (a.y + b.y + c.y) / 3,
      z: (a.z + b.z + c.z) / 3
    };
  }

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