import globeScene from './3js_resources/globeScene';


const earth = new globeScene();
earth.init();
earth.animate();


var fs = require('fs');
fs.writeFile('hello.txt', 'TEXT HERE', 'ascii');  

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
          document.getElementById('dataContainer').appendChild(table);
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

document.getElementById('minIcon').onclick = (e) => {
  e.preventDefault();
  document.getElementById('earth').classList.add('fullscreen');
  document.getElementById('panel').classList.add('hidden');
  document.getElementById('minimizedPanel').classList.add('shown');
};

document.getElementById('maxIcon').onclick = (e) => {
  e.preventDefault();
  document.getElementById('earth').classList.remove('fullscreen');
  document.getElementById('panel').classList.remove('hidden');
  document.getElementById('minimizedPanel').classList.remove('shown');
};