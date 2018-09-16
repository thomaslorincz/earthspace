import globeScene from './3js_resources/globeScene';

const earth = new globeScene();
earth.init();
earth.animate();

document.getElementById('listPanel').ondragover = (e) => {
  e.preventDefault();
  document.getElementById('listPanel').classList.add('dragOver');
};

document.getElementById('listPanel').ondragleave = (e) => {
  e.preventDefault();
  document.getElementById('listPanel').classList.remove('dragOver');
};

document.getElementById('listPanel').ondrop = (e) => {
  e.preventDefault();

  let dataMap = {};
  let min = Infinity;
  let max = 0;

  if (e.dataTransfer.items) {
    // Use DataTransferItemList interface to access the file(s)
    for (let i = 0; i < e.dataTransfer.items.length; i++) {
      // If dropped items aren't files, reject them
      if (e.dataTransfer.items[i].kind === 'file') {
        const file = e.dataTransfer.items[i].getAsFile();
        const reader = new FileReader();
        reader.readAsText(file);
        reader.onload = (e) => {
          document.getElementById('dataContainer').removeChild(document.getElementById('dragAndDropContainer'));
          const table = document.createElement('table');
          table.setAttribute('id', 'table');
          document.getElementById('dataContainer').appendChild(table);
          let csvData = e.target.result;
          csvData = csvData.replace(/"/g, '');
          const rows = csvData.split('\n');
          for (let j = 0; j < rows.length; j++) {
            const row = rows[j].split(',');
            const tableRow = document.createElement('tr');
            table.appendChild(tableRow);
            let key = null;
            for (let k = 0; k < row.length; k++) {
              const tableCell = document.createElement('td');
              if (j === 0) {
                tableCell.classList.add('header');
              } else if (k === 0) {
                key = row[k].toString().toLowerCase();
              } else {
                dataMap[key] = parseFloat(row[k]);
                if (dataMap[key] < min) {
                  min =  dataMap[key];
                }
                if (dataMap[key] > max) {
                  max = dataMap[key];
                }
              }
              tableCell.innerText = row[k];
              tableRow.appendChild(tableCell);
            }
          }
          earth.choropleth(dataMap, min, max);
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

document.getElementById('minIcon').onclick = (e) => {
  e.preventDefault();
  document.getElementById('earth').classList.add('fullscreen');
  document.getElementById('listPanel').classList.add('minimized');
  document.getElementById('layersPanel').classList.add('minimized');
  document.getElementById('minimizedPanel').classList.add('shown');
};

document.getElementById('maxIcon').onclick = (e) => {
  e.preventDefault();
  document.getElementById('earth').classList.remove('fullscreen');
  document.getElementById('listPanel').classList.remove('minimized');
  document.getElementById('layersPanel').classList.remove('minimized');
  document.getElementById('minimizedPanel').classList.remove('shown');
};

document.getElementById('listIcon').onclick = (e) => {
  e.preventDefault();
  document.getElementById('listIcon').classList.add('selected');
  document.getElementById('listPanel').classList.remove('hidden');
  document.getElementById('layersIcon').classList.remove('selected');
  document.getElementById('layersPanel').classList.add('hidden');
};

document.getElementById('layersIcon').onclick = (e) => {
  e.preventDefault();
  document.getElementById('layersIcon').classList.add('selected');
  document.getElementById('layersPanel').classList.remove('hidden');
  document.getElementById('listIcon').classList.remove('selected');
  document.getElementById('listPanel').classList.add('hidden');
};