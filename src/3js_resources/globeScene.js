var SCREEN_WIDTH = window.innerWidth,
SCREEN_HEIGHT = window.innerHeight,

mouseX = 0, mouseY = 0,
    
earthRadius = 455,

windowHalfX = window.innerWidth / 2,
windowHalfY = window.innerHeight / 2,

camera, cameraController, scene, renderer, controls,

earthMesh, chloroplethEarth, countryMap;

init();
animate();
//chloroplethMapping();

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
        earthMat.map = new THREE.TextureLoader().load('/src/3js_resources/textures/earth_lightsBW.jpg');
    var chloroplethGeo = new THREE.SphereGeometry(456, 400, 400);
    earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthMesh.position.set(0, 0, 0);
    scene.add(earthMesh);
    var chloroplethMat = new THREE.MeshBasicMaterial();
    chloroplethMat.map = new THREE.TextureLoader().load('/src/3js_resources/textures/earth_lightsBW.jpg');
    chloroplethMat.opacity = 0;
    chloroplethEarth = new THREE.Mesh( earthGeo, chloroplethMat);
    chloroplethEarth.scale.set(1.01,1.01,1.01);
    chloroplethEarth.position.set(0, 0, 0);
    chloroplethEarth.rotation.set(-0.04,-0.24000000000000002,0);
    //chloroplethEarth.rotation.set(0,-0.9,-0.2);
    scene.add(chloroplethEarth);
    
    scene.background = new THREE.TextureLoader().load('/src/3js_resources/textures/milk_backg.jpg');
    chloroplethMapping();

    // change to a key event listener or look up a better way to do this
    document.addEventListener( 'keydown', onGetKeyDown );
    window.addEventListener( 'resize', onWindowResize, false );

}

function chloroplethMapping () {
    var d3 = Plotly.d3;
    var img_jpg= d3.select('#jpg-export');
    Plotly.d3.csv('https://raw.githubusercontent.com/plotly/datasets/master/2014_world_gdp_with_codes.csv', function(err, rows){
      function unpack(rows, key) {
          return rows.map(function(row) { return row[key]; });
      }

       var data = [{
            type: 'choropleth',
            locations: unpack(rows, 'CODE'),
            z: unpack(rows, 'Value'),
            text: unpack(rows, 'COUNTRY'),
            colorscale: [
                [0,'rgb(5, 10, 172)'],[0.35,'rgb(40, 60, 190)'],
                [0.5,'rgb(70, 100, 245)'], [0.6,'rgb(90, 120, 245)'],
                [0.7,'rgb(106, 137, 247)'],[1,'rgb(220, 220, 220)']],
            autocolorscale: false,
            reversescale: true,
            showscale: false,
            marker: {
                line: {
                    color: 'rgb(180,180,180)',
                    width: 0.5
                }
            }
      }];

      var layout = {
          geo:{
              showframe: false,
              showcoastlines: true,
              projection:{
                  //type: 'Equirectangular'
                  type: 'Natural earth'
              }
          }
      };
      Plotly.plot(document.createElement('mydiv'), data, layout, {showLink: false}).then(
          function(gd)
          {
              Plotly.toImage(gd,{height:2048,width:4096}).then(
                  function(url)
                  {
                      img_jpg.attr("src",url);
                      return Plotly.toImage(gd,{format:'jpeg',height:2048,width:4096});
                  }
              ).then(function(img) {
                var tex = new THREE.TextureLoader().load(img);
                tex.repeat.x = 0.9351027703306524;
                tex.offset.y = 0.08;
                // 1.0927734375;
                tex.repeat.y = 0.8596228109564436;
                // 1.08740234375;
                chloroplethEarth.material.map = tex;
                chloroplethEarth.material.opacity = 0.3;
                chloroplethEarth.material.transparent = true;
                console.log(chloroplethEarth);
            })
          });
});
}

function distanceBetween(point1, point2) {
    var dx = point2.x - point1.x;
    var dy = point2.y - point1.y;
    var dz = point2.z - point1.z;
    return Math.sqrt((dx*dx) + (dy*dy) + (dz*dz));
}

function latLongToCoords(latitude, longitude, radius) {
    var phi   = (90-latitude)*(Math.PI/180);
    var theta = (longitude+180)*(Math.PI/180);

    x = -((radius) * Math.sin(phi)*Math.cos(theta));
    z = ((radius) * Math.sin(phi)*Math.sin(theta));
    y = ((radius) * Math.cos(phi));

    return [x,y,z];
}

function onGetKeyDown ( event ) {
    var inputkeyCode = event.keyCode;
    // check and use keycode events
    if (inputkeyCode == 74) {
        // right arrow key
        chloroplethEarth.rotation.y += 0.04;
    } else if (inputkeyCode == 71) {
        // left arrow key
        chloroplethEarth.rotation.y -= 0.04;
    } else if (inputkeyCode == 89) {
        // up arrow key
        chloroplethEarth.rotation.x += 0.04;
    } else if (inputkeyCode == 72) {
        // down arrow key
        chloroplethEarth.rotation.x -= 0.04;
    } else if (inputkeyCode == 73) {
        // i key
        chloroplethEarth.scale.x += 0.04;
        chloroplethEarth.scale.y += 0.04;
        chloroplethEarth.scale.z += 0.04;
    } else if (inputkeyCode == 75) {
        // k key
        chloroplethEarth.scale.x -= 0.04;
        chloroplethEarth.scale.y -= 0.04;
        chloroplethEarth.scale.z -= 0.04;
    } else if (inputkeyCode == 112) {
        chloroplethEarth.material.map.repeat.x  += 0.04;
    } else if (inputkeyCode == 111) {
        chloroplethEarth.material.map.repeat.x  -= 0.04;
    }  else if (inputkeyCode == 114) {
        chloroplethEarth.material.map.repeat.y  += 0.04;
    } else if (inputkeyCode == 102) {
        chloroplethEarth.material.map.repeat.y  -= 0.04;
    }
    console.log(chloroplethEarth);
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

export {init, animate}