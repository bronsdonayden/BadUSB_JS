const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.text());
app.use(express.json());
app.use(express.static('public'));

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

app.post('/upload/dirs', (req, res) => {
  console.log(req);
  res.sendStatus(200);
});

app.post('/upload/files', (req, res) => {
  // TODO
  res.sendStatus(200);
});

app.post('/upload/images', (req, res) => {
  // TODO
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