const ws = new WebSocket(`ws://${window.location.host}`);
let fileTree = {};
let currentPath = [];
let imageData = {};
let textData = {};


// gets the icon for the type of file.
function getIconPath(name, isFolder) {
  if (isFolder) return '/images/folder.png';
  const ext = name.split('.').pop().toLowerCase();
  const icons = {
    txt: '/images/txt.png',
    log: '/images/log.png',


  };
  return icons[ext] || '/images/file.png';
}



// Makes the windows draggable
function makeDraggable(windowEl, titlebarEl) {
  let offsetX, offsetY, isDragging = false;

  titlebarEl.addEventListener('mousedown', (e) => {
    isDragging = true;
    offsetX = e.clientX - windowEl.offsetLeft;
    offsetY = e.clientY - windowEl.offsetTop;
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    windowEl.style.left = (e.clientX - offsetX) + 'px';
    windowEl.style.top = (e.clientY - offsetY) + 'px';
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
  });
}

// Uses the function makeDraggable, to make the draggable.
makeDraggable(document.getElementById('explorer'), document.getElementById('explorer-titlebar'));
makeDraggable(document.getElementById('image-viewer'), document.getElementById('viewer-titlebar'));
makeDraggable(document.getElementById('text-viewer'), document.getElementById('text-viewer-titlebar'));

// renders text viewer
function TextViewer(fullPath){
 const string = textData[fullPath];
 const textShown = document.getElementById('text-viewer-content');
 const viewer = document.getElementById('text-viewer');
 textShown.value = string;
  viewer.classList.remove('hidden');

}


// Renders image viewer
function ImageViewer(fullPath){
  const base64 = imageData[fullPath];
  const img = document.getElementById('viewer-img');
  img.src = 'data:image;base64,' + base64;
  document.getElementById('image-viewer').classList.remove('hidden');
  
}

// Gets the current node in the tree, in better terms it gets the current folder you are in.
function getNode(path) {
  let node = fileTree;
  for(let i = 0; i < path.length; i++){
    node = node[path[i]];
  }
  return node;
}


//Opens the file explorer, checks if the node has any children, if it doesn't that menans 
//it is a file, not a directory, so then when you double click it opens the file. Either image or some form of text
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
      const img = document.createElement('img');
      img.src = '/images/folder.png';
      const label = document.createElement('span');
      label.textContent = childName;
      childDiv.appendChild(img);
      childDiv.appendChild(label);

      childDiv.addEventListener('dblclick', () => {
        currentPath.push(childName);
        renderFileExplorer();
      });
    } else {
      const img = document.createElement('img');
      const ext = childName.split('.').pop().toLowerCase();
      const fullPath = currentPath.join('\\') + '\\' + childName;

      if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'].includes(ext)) {
        if (imageData[fullPath]) {
          img.src = 'data:image;base64,' + imageData[fullPath];
        } else {
          img.src = '/images/jpg.png';
        }
      } else {
        img.src = getIconPath(childName, false);
      }

      const label = document.createElement('span');
      label.textContent = childName;
      childDiv.appendChild(img);
      childDiv.appendChild(label);

      childDiv.addEventListener('dblclick', () => {
        if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'].includes(ext)) {
          ImageViewer(fullPath);
        } else if (['txt', 'log', 'csv'].includes(ext)) {
          TextViewer(fullPath);
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

//close text viewer
document.getElementById('text-viewer-close').addEventListener('click', () => {
  document.getElementById('text-viewer').classList.add('hidden');
});

// Back button, goes back in the file explorer.
document.getElementById('explorer-back').addEventListener('click', () => {

  if(currentPath.length > 1){
    currentPath.pop();
  }
  renderFileExplorer();

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
      const img = document.createElement('img');
      img.src = '/images/folder.png';
      const label = document.createElement('span');
      label.textContent = name;
      div.appendChild(img);
      div.appendChild(label);
      

      div.addEventListener('dblclick', (event) =>{
        currentPath.push(name);
        document.getElementById('explorer').classList.remove('hidden');
        renderFileExplorer();
          
        });
        desktop.appendChild(div);
      });

      

  }
  
  else if(msg.type === 'files'){
    textData[msg.data.path] = msg.data.text;
  }
  
  else if(msg.type === 'image'){

    imageData[msg.data.path] = msg.data.base64;


  }

};


ws.onopen = () => {
  console.log('Connected to server');
};
