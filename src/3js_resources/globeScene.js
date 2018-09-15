export default class globeScene {
  constructor() {
    this.mouseX = 0;
    this.mouseY = 0;
    this.earthRadius = 455;
    this.camera = null;
    this.cameraController = null;
    this.scene = null;
    this.renderer = null;
    this.controls = null;
    this.earthMesh = null;
    this.choroplethEarth = null;
    this.countryMap = null;
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

    //EARTH
    const earthGeo = new THREE.SphereGeometry (455, 400, 400);
    const earthMat = new THREE.MeshBasicMaterial();
    earthMat.map = new THREE.TextureLoader().load('/src/3js_resources/textures/earth_lightsBW.jpg');
    const choroplethGeo = new THREE.SphereGeometry(456, 400, 400);
    this.earthMesh = new THREE.Mesh(earthGeo, earthMat);
    this.earthMesh.position.set(0, 0, 0);
    this.scene.add(this.earthMesh);
    const choroplethMat = new THREE.MeshBasicMaterial();
    choroplethMat.map = new THREE.TextureLoader().load('/src/3js_resources/textures/earth_lightsBW.jpg');
    choroplethMat.opacity = 0;
    this.choroplethEarth = new THREE.Mesh(earthGeo, choroplethMat);
    this.choroplethEarth.scale.set(1.01,1.01,1.01);
    this.choroplethEarth.position.set(0, 0, 0);
    this.choroplethEarth.rotation.set(-0.04,-0.24000000000000002,0);
    this.scene.add(this.choroplethEarth);

    this.scene.background = new THREE.TextureLoader().load('/src/3js_resources/textures/milk_backg.jpg');
    this.choroplethMapping();

    window.addEventListener('resize', () => this.onWindowResize(), false);
  }

  choroplethMapping() {
    const img_jpg = Plotly.d3.select('#jpg-export');
    Plotly.d3.csv('https://raw.githubusercontent.com/plotly/datasets/master/2014_world_gdp_with_codes.csv', (err, rows) => {
      function unpack(rows, key) {
        return rows.map(function(row) { return row[key]; });
      }

      const data = [{
        type: 'choropleth',
        locations: unpack(rows, 'CODE'),
        z: unpack(rows, 'GDP (BILLIONS)'),
        text: unpack(rows, 'COUNTRY'),
        colorscale: [
          [0,'rgb(5, 10, 172)'],[0.35,'rgb(40, 60, 190)'],
          [0.5,'rgb(70, 100, 245)'], [0.6,'rgb(90, 120, 245)'],
          [0.7,'rgb(106, 137, 247)'],[1,'rgb(220, 220, 220)']],
        autocolorscale: true,
        showscale: false,
        marker: {
          line: {
            color: 'rgb(43,43,43)',
            width: 0.5
          }
        }
      }];

      const layout = {
        geo: {
          showframe: false,
          showcoastlines: true,
          projection:{
            type: 'Natural earth'
          }
        }
      };
      Plotly.plot(document.createElement('div'), data, layout, {showLink: false}).then((gd) => {
        Plotly.toImage(gd,{height:2048,width:4096}).then((url) => {
            img_jpg.attr("src", url);
            console.log('img_jpg', img_jpg);
            return Plotly.toImage(gd,{format:'jpeg',height:2048,width:4096});
          }
        ).then((img) => {
          const tex = new THREE.TextureLoader().load(img);
          tex.repeat.x = 0.9351027703306524;
          tex.offset.y = 0.08;
          // 1.0927734375;
          tex.repeat.y = 0.8596228109564436;
          // 1.08740234375;
          this.choroplethEarth.material.map = tex;
          this.choroplethEarth.material.opacity = 1;
          this.choroplethEarth.material.transparent = true;
          console.log(this.choroplethEarth);
        })
      });
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