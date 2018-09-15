import { setEvents } from '../common/setEvent';
import { getEventCenter, geodecoder } from '../common/geoHelpers';
import { mapTexture } from '../common/mapTexture';
import { memoize } from '../common/utils';
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

    this.camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 10000 );
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
    let earthGeo = new THREE.SphereGeometry (455, 400, 400);
    let earthMat = new THREE.MeshBasicMaterial();
    earthMat.map = new THREE.TextureLoader().load('/src/3js_resources/textures/earth_lightsBW.jpg');

    this.earthMesh = new THREE.Mesh(earthGeo, earthMat);
    this.earthMesh.position.set(0, 0, 0);
    this.scene.add(this.earthMesh);

    // let choroplethMat = new THREE.MeshBasicMaterial();
    // choroplethMat.map = new THREE.TextureLoader().load('/src/3js_resources/textures/earth_lightsBW.jpg');
    // choroplethMat.opacity = 0;
    // this.choroplethEarth = new THREE.Mesh(earthGeo, choroplethMat);
    // this.choroplethEarth.scale.set(1.01,1.01,1.01);
    // this.choroplethEarth.position.set(0, 0, 0);
    // this.choroplethEarth.rotation.set(-0.04,-0.24000000000000002,0);
    // this.scene.add(this.choroplethEarth);

    this.scene.background = new THREE.TextureLoader().load('/src/3js_resources/textures/milk_backg.jpg');

    window.addEventListener('resize', () => this.onWindowResize(), false);

    d3.json('/data/world.json', (err, data) => {
      const segments = 155; // number of vertices. Higher = better mouse accuracy

      // Setup cache for country textures
      const countries = topojsonFeature(data, data.objects.countries);

      this.geo = geodecoder(countries.features);
      this.textureCache = memoize((id, color) => {
        const country = this.geo.find(id);
        return mapTexture(country, color);
      });

      // Base globe with blue "water"
      let oceanMaterial = new THREE.MeshPhongMaterial({color: '#2B2B2B', transparent: true});
      let sphere = new THREE.SphereGeometry(200, segments, segments);
      let baseGlobe = new THREE.Mesh(sphere, oceanMaterial);
      baseGlobe.rotation.y = Math.PI;
      baseGlobe.addEventListener('mousemove', (e) => this.onGlobeMousemove(e));

      // add base map layer with all countries
      let worldTexture = mapTexture(countries, '#647089');
      let mapMaterial  = new THREE.MeshPhongMaterial({map: worldTexture, transparent: true});
      let baseMap = new THREE.Mesh(new THREE.SphereGeometry(200, segments, segments), mapMaterial);
      baseMap.rotation.y = Math.PI;

      setEvents(camera, [baseGlobe], 'click');
      setEvents(camera, [baseGlobe], 'mousemove', 10);
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

  onGlobeMousemove(event) {
    let map;
    let material;

    // Get pointc, convert to latitude/longitude
    const latlng = getEventCenter.call(this, event);

    // Look for country at that latitude/longitude
    const country = this.geo.search(latlng[0], latlng[1]);

    if (country !== null && country.code !== this.currentCountry) {

      // Track the current country displayed
      this.currentCountry = country.code;

      // Update the html
      // d3.select("#msg").html(country.code);

      // Overlay the selected country
      map = this.textureCache(country.code, '#3B3B3B');
      material = new THREE.MeshPhongMaterial({map: map, transparent: true});
      if (!this.overlay) {
        this.overlay = new THREE.Mesh(new THREE.SphereGeometry(201, 40, 40), material);
        this.overlay.rotation.y = Math.PI;
        this.scene.add(this.overlay);
      } else {
        this.overlay.material = material;
      }
    }
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