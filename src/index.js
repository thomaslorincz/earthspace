var SCREEN_WIDTH = window.innerWidth,
  SCREEN_HEIGHT = window.innerHeight,

  mouseX = 0, mouseY = 0,

  earthRadius = 455,

  windowHalfX = window.innerWidth / 2,
  windowHalfY = window.innerHeight / 2,

  camera, cameraController, scene, renderer, controls;

var earthMesh;

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

init();
animate();

document.getElementById('panel').ondragover = (e) => {
  e.preventDefault();
  document.getElementById('panel').classList.add('dragOver');
};

document.getElementById('panel').ondragleave = (e) => {
  e.preventDefault();
  document.getElementById('panel').classList.remove('dragOver');
};

document.getElementById('panel').ondrop = (e) => {
  e.preventDefault();

  if (e.dataTransfer.items) {
    // Use DataTransferItemList interface to access the file(s)
    for (let i = 0; i < e.dataTransfer.items.length; i++) {
      // If dropped items aren't files, reject them
      if (e.dataTransfer.items[i].kind === 'file') {
        const file = e.dataTransfer.items[i].getAsFile();
        const reader = new FileReader();
        reader.readAsText(file);
        reader.onload = (e) => {
          const table = document.createElement('table');
          table.setAttribute('id', 'table');
          document.getElementById('panel').appendChild(table);
          let csvData = e.target.result;
          csvData = csvData.replace(/"/g, '');
          const rows = csvData.split('\n');
          for (let j = 0; j < rows.length; j++) {
            const row = rows[j].split(',');
            const tableRow = document.createElement('tr');
            table.appendChild(tableRow);
            for (let k = 0; k < row.length; k++) {
              const tableCell = document.createElement('td');
              if (j === 0) {
                tableCell.classList.add('header');
              }
              tableCell.innerText = row[k];
              tableRow.appendChild(tableCell);
            }
          }
        };
      }
    }
  } else {
    // Use DataTransfer interface to access the file(s)
    for (let i = 0; i < e.dataTransfer.files.length; i++) {
      console.log('... file[' + i + '].name = ' + e.dataTransfer.files[i].name);
    }
  }

  if (e.dataTransfer.items) {
    // Use DataTransferItemList interface to remove the drag data
    e.dataTransfer.items.clear();
  } else {
    // Use DataTransfer interface to remove the drag data
    e.dataTransfer.clearData();
  }
};