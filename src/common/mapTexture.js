import * as THREE from 'three';
import * as d3 from 'd3';

export function mapTexture(geojson, dataMap, min, max) {
  const projection = d3.geoEquirectangular()
    .translate([1024, 512])
    .scale(325);

  let colorScale = null;
  if (dataMap && min && max) {
    colorScale = d3.scaleLinear()
      .domain([
        min,
        ((max - min) / 10) + min,
        2 * ((max - min) / 10) + min,
        3 * ((max - min) / 10) + min,
        4 * ((max - min) / 10) + min,
        5 * ((max - min) / 10) + min,
        6 * ((max - min) / 10) + min,
        7 * ((max - min) / 10) + min,
        8 * ((max - min) / 10) + min,
        9 * ((max - min) / 10) + min,
        max
      ])
      .range([
        '#fee5e1',
        '#fdd0cc',
        '#fbb6bc',
        '#fa95b1',
        '#f768a1',
        '#e24099',
        '#c11b88',
        '#99017b',
        '#700074',
        '#49006a'
      ]);
  }

  var texture, context, canvas;

  canvas = d3.select('body').append('canvas')
    .style('display', 'none')
    .attr('width', '2048px')
    .attr('height', '1024px');

  context = canvas.node().getContext('2d');

  var path = d3.geoPath()
    .projection(projection)
    .context(context);

  if (geojson.features) {
    for (let i = 0; i < geojson.features.length; i++) {
      const feature = geojson.features[i];

      context.strokeStyle = '#333';
      context.lineWidth = 1;
      if (dataMap) {
        context.fillStyle = colorScale(dataMap[feature.id.toLowerCase()]);
      } else {
        context.fillStyle = '#FFFFFF';
      }

      context.beginPath();
      path(feature.geometry);
      context.fill();
      context.stroke();
    }
  } else {
    context.strokeStyle = '#333';
    context.lineWidth = 1;
    context.fillStyle = '#FFFFFF';
    context.beginPath();
    path(geojson);
    context.fill();
    context.stroke();
  }

  texture = new THREE.Texture(canvas.node());
  texture.needsUpdate = true;

  canvas.remove();

  return texture;
}