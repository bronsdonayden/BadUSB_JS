const ws = new WebSocket(`ws://${window.location.host}`);
let fileTree = {};
let currentPath = [];
let imageData = {};

function ImageViewer(fullPath){
  const base64 = imageData[fullPath];
  const img = document.getElementById('viewer-img');
  img.src = 'data:image;base64,' + base64;
  document.getElementById('image-viewer').classList.remove('hidden');
  
}


function getNode(path) {
  let node = fileTree;
  for(let i = 0; i < path.length; i++){
    node = node[path[i]];
  }
  return node;
}

function renderFileExplorer() {
  const node = getNode(currentPath);
  const content = document.getElementById('explorer-content');
  content.innerHTML = '';
  const keys = Object.keys(node);

  keys.forEach((childName) => {
    const childDiv = document.createElement('div');
    const isFolder = node[childName] !== null;
    childDiv.className = 'desktop-icon';

    if (isFolder) {
      childDiv.textContent = '📁' + childName;
      childDiv.addEventListener('dblclick', () => {
        currentPath.push(childName);
        renderFileExplorer();
      });
    } else {
      childDiv.textContent = '📄' + childName;
      childDiv.addEventListener('dblclick', () => {
        const ext = childName.split('.').pop().toLowerCase();
        const fullPath = currentPath.join('\\') + '\\' + childName;
        if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'].includes(ext)) {
          ImageViewer(fullPath);
        } else if (['txt', 'log', 'csv'].includes(ext)) {
          // TODO: open text viewer with fullPath
        }
      });
    }

    content.appendChild(childDiv);
  });
}

// Closes the file explorer.
document.getElementById('explorer-close').addEventListener('click', () => {
  document.getElementById('explorer').classList.add('hidden');
  currentPath = [];
});

//Close image viewer
document.getElementById('viewer-close').addEventListener('click', () => {
  document.getElementById('image-viewer').classList.add('hidden');
});

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  
  
  if(msg.type === 'dirs'){
  
    const desktop = document.getElementById('desktop');
    const keys = Object.keys(msg.data);
    fileTree = msg.data;
    keys.forEach((name) => {

      const div = document.createElement('div');
      div.className = 'desktop-icon';
      div.textContent = '📁' + name;
      

      div.addEventListener('dblclick', (event) =>{
        currentPath.push(name);
        document.getElementById('explorer').classList.remove('hidden');
        renderFileExplorer();
          
        });
        desktop.appendChild(div);
      });

      

  }
  
  else if(msg.type === 'files'){
    const app = document.getElementById('desktop');
    const div = document.createElement('div');
    div.textContent = msg.data;
    app.appendChild(div);
  }
  
  else if(msg.type === 'image'){

    imageData[msg.data.path] = msg.data.base64;


  }

};


ws.onopen = () => {
  console.log('Connected to server');
};
