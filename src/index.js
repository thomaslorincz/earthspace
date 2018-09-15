var SCREEN_WIDTH = window.innerWidth,
  SCREEN_HEIGHT = window.innerHeight,

  mouseX = 0, mouseY = 0,

  earthRadius = 455,

  windowHalfX = window.innerWidth / 2,
  windowHalfY = window.innerHeight / 2,

  camera, cameraController, scene, renderer, controls;

var earthMesh;

init();
animate();

function init() {

  var container;

  container = document.createElement('div');
  document.getElementById('earth').appendChild(container);

  camera = new THREE.PerspectiveCamera( 75, SCREEN_WIDTH / SCREEN_HEIGHT, 0.1, 10000 );
  camera.position.z = 1000;
  cameraController = new THREE.Object3D();
  cameraController.add(camera);

  scene = new THREE.Scene();
  scene.add(cameraController);

  renderer = new THREE.WebGLRenderer({antialiasing : true});
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( SCREEN_WIDTH, SCREEN_HEIGHT );
  container.appendChild( renderer.domElement );

  // setup controls and rerender when controlling to avoid frame lag
  controls = new THREE.OrbitControls( camera, renderer.domElement);
  controls.addEventListener( 'change', render );

  //EARTH
  var earthGeo = new THREE.SphereGeometry (455, 400, 400),
    earthMat = new THREE.MeshBasicMaterial();
  earthMat.map = THREE.ImageUtils.loadTexture('/src/3js_resources/textures/earth_lightsBW.jpg');
  earthMesh = new THREE.Mesh(earthGeo, earthMat);
  earthMesh.position.set(0, 0, 0);
  scene.add(earthMesh);

  scene.background = THREE.ImageUtils.loadTexture('/src/3js_resources/textures/milk_backg.jpg');

  // change to a key event listener or look up a better way to do this
  document.addEventListener( 'keydown', onGetKeyDown );
  window.addEventListener( 'resize', onWindowResize, false );

}

function onGetKeyDown ( event ) {
  var inputkeyCode = event.keyCode;
  // check and use keycode events
}

// responsively resize 3js canvas to window size
function onWindowResize() {
  windowHalfX = window.innerWidth / 2;
  windowHalfY = window.innerHeight / 2;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );
}

// update loop call
function animate() {
  requestAnimationFrame( animate );
  controls.update();
  render();
}

// rerender scene on tick
function render() {
  renderer.clear();
  renderer.render(scene, camera);
}