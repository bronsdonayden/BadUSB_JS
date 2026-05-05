const ws = new WebSocket(`wss://${window.location.host}`);
let fileTree = {};
let currentPath = [];
let imageData = {};
let textData = {};

// For sidebar 
function findFolderPath(tree, targetName, currentPath = []) {
  for (const key of Object.keys(tree)) {
    if (tree[key] !== null && typeof tree[key] === 'object') {
      if (key === targetName) return [...currentPath, key];
      const result = findFolderPath(tree[key], targetName, [...currentPath, key]);
      if (result) return result;
    }
  }
  return null;
}

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

makeDraggable(document.getElementById('explorer'), document.getElementById('explorer-titlebar'));
makeDraggable(document.getElementById('image-viewer'), document.getElementById('viewer-titlebar'));
makeDraggable(document.getElementById('text-viewer'), document.getElementById('text-viewer-titlebar'));

// renders text viewer
function TextViewer(fullPath) {
  const string = textData[fullPath];
  const textShown = document.getElementById('text-viewer-content');
  const viewer = document.getElementById('text-viewer');
  textShown.value = string;
  viewer.classList.remove('hidden');
}

// Renders image viewer
function ImageViewer(fullPath) {
  const base64 = imageData[fullPath];
  const ext = fullPath.split('.').pop().toLowerCase();
  const imageTypes = {
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'bmp': 'image/bmp'
  };
  const type = imageTypes[ext] || 'image/png';
  const img = document.getElementById('viewer-img');
  img.src = `data:${type};base64,${base64}`;
  document.getElementById('image-viewer').classList.remove('hidden');
}

function renderDesktop() {
  const desktopPath = findFolderPath(fileTree, 'Desktop');
  if (!desktopPath) return;

  const desktopNode = getNode(desktopPath);
  if (!desktopNode) return;

  const desktop = document.getElementById('desktop');
  desktop.innerHTML = '';

  Object.keys(desktopNode).forEach(childName => {
    const div = document.createElement('div');
    div.className = 'desktop-icon';
    const ext = childName.split('.').pop().toLowerCase();
    const fullPath = desktopPath.join('\\') + '\\' + childName;
    const isFolder = desktopNode[childName] !== null;
    const img = document.createElement('img');

    if (isFolder) {
      img.src = '/images/folder.png';
      div.addEventListener('dblclick', () => {
        currentPath = [...desktopPath, childName];
        document.getElementById('explorer').classList.remove('hidden');
        renderFileExplorer();
      });
    } else {
      if (['jpg','jpeg','png','webp','gif','bmp'].includes(ext) && imageData[fullPath]) {
        const mimeTypes = {'png':'image/png','jpg':'image/jpeg','jpeg':'image/jpeg','gif':'image/gif','webp':'image/webp','bmp':'image/bmp'};
        img.src = `data:${mimeTypes[ext]||'image/png'};base64,${imageData[fullPath]}`;
      } else {
        img.src = getIconPath(childName, false);
      }
      div.addEventListener('dblclick', () => {
        if (['jpg','jpeg','png','webp','gif','bmp'].includes(ext)) {
          ImageViewer(fullPath);
        } else if (['txt','log','csv'].includes(ext)) {
          TextViewer(fullPath);
        }
      });
    }

    const label = document.createElement('span');
    label.textContent = childName;
    div.appendChild(img);
    div.appendChild(label);
    desktop.appendChild(div);
  });
}

// Gets the current node in the tree
function getNode(path) {
  let node = fileTree;
  for (let i = 0; i < path.length; i++) {
    node = node[path[i]];
  }
  return node;
}

function renderFileExplorer() {
  const node = getNode(currentPath);
  const content = document.getElementById('explorer-content');
  content.innerHTML = '';

  if (!node) return;

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
      const fullPath = currentPath.length > 0 ? currentPath.join('\\') + '\\' + childName : childName;

      if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'].includes(ext)) {
        if (imageData[fullPath]) {
          const imageTypes = {
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'bmp': 'image/bmp'
          };
          const image = imageTypes[ext] || 'image/png';
          img.src = `data:${image};base64,${imageData[fullPath]}`;
        } else {
          img.src = '/images/file.png';
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

// Close image viewer
document.getElementById('viewer-close').addEventListener('click', () => {
  document.getElementById('image-viewer').classList.add('hidden');
});

// Close text viewer
document.getElementById('text-viewer-close').addEventListener('click', () => {
  document.getElementById('text-viewer').classList.add('hidden');
});

// Back button
document.getElementById('explorer-back').addEventListener('click', () => {
  if (currentPath.length > 0) {
    currentPath.pop();
  }
  renderFileExplorer();
});

// Taskbar button
document.getElementById('taskbar-explorer').addEventListener('click', () => {
  const explorer = document.getElementById('explorer');
  explorer.classList.toggle('hidden');
  if (!explorer.classList.contains('hidden')) {
    console.log('fileTree at open:', fileTree);
    renderFileExplorer();
  }
});

// Sidebar items
document.querySelectorAll('.sidebar-item').forEach(item => {
  item.addEventListener('click', () => {
    const folderName = item.dataset.folder;
    const path = findFolderPath(fileTree, folderName);
    if (path) {
      currentPath = path;
      renderFileExplorer();
    }
  });
});


document.getElementById('sidebar-root').addEventListener('click', () => {
  currentPath = [];
  renderFileExplorer();
});

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);

  if (msg.type === 'dirs') {
    fileTree = msg.data;
    renderDesktop();

  } else if (msg.type === 'files') {
    textData[msg.data.path] = msg.data.text;

  } else if (msg.type === 'image') {
    imageData[msg.data.path] = msg.data.base64;

  } else if (msg.type === 'wallpaper') {
    const data = msg.data.base64;
    document.getElementById('desktop').style.backgroundImage = `url(data:image/jpeg;base64,${data})`;
  }else if (msg.type === 'reset'){
    fileTree = {};
    textData = {};
    imageData = {};
    currentPath = [];
    document.getElementById('desktop').innerHTML = '';
    document.getElementById('desktop').style.backgroundImage = '';
    document.getElementById('explorer').classList.add('hidden');
  }
};

ws.onopen = () => {
  console.log('Connected to server');
};