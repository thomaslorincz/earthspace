import * as THREE from 'three';
import { debounce } from './utils';
import * as d3 from 'd3';

export function setEvents(camera, items, type, wait) {

  let raycaster = new THREE.Raycaster();

  let listener = function(event) {
    let mouse = {
      x: ((event.offsetX - 1) / parseFloat(d3.select('canvas').node().style.width) ) * 2 - 1,
      y: -((event.offsetY - 1) / parseFloat(d3.select('canvas').node().style.height) ) * 2 + 1
    };
    let vector = new THREE.Vector3();
    vector.set(mouse.x, mouse.y, 0.5);
    vector.unproject(camera);

    raycaster.ray.set(camera.position, vector.sub(camera.position).normalize());
    let target = raycaster.intersectObjects(items);

    if (target.length) {
      target[0].type = type;
      target[0].object.dispatchEvent(target[0]);
    }

  };

  if (!wait) {
    document.addEventListener(type, listener, false);
  } else {
    document.addEventListener(type, debounce(listener, wait), false);
  }
}