const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Эта строчка заставит сервер делиться файлами из твоей папки!
app.use(express.static(__dirname));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let leaders = [];

app.post('/api/score', (req, res) => {
  const { username, wpm } = req.body;
  if (!username) return res.status(400).json({ error: 'No username' });
  leaders.push({ name: username, wpm: parseInt(wpm) || 0 });
  leaders.sort((a, b) => b.wpm - a.wpm);
  leaders = leaders.slice(0, 10);
  res.json({ success: true, leaders });
});

app.get('/api/leaders', (req, res) => {
  res.json({ leaders });
});

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      const reply = {
        type: data.type || 'message',
        username: data.username || data.name || 'Аноним',
        text: data.text || data.message || ''
      };
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(reply));
        }
      });
    } catch (e) {}
  });
});

// Слушаем порт 3000 на всех адресах
server.listen(3000, '0.0.0.0', () => {
  console.log('=== СЕРВЕР ГОТОВ ДЛЯ ДРУЗЕЙ ===');
});