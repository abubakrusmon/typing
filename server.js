const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Хранилище лидеров в памяти
let leaders = [];

// API для рейтинга
app.post('/api/score', (req, res) => {
  const { username, wpm } = req.body;
  if (!username) return res.status(400).json({ error: 'No username' });
  
  leaders.push({ name: username, wpm: parseInt(wpm) || 0 });
  leaders.sort((a, b) => b.wpm - a.wpm);
  leaders = leaders.slice(0, 10); // оставляем топ-10
  
  res.json({ success: true, leaders });
});

app.get('/api/leaders', (req, res) => {
  res.json({ leaders });
});

// Логика чата через WebSocket
wss.on('connection', (ws) => {
  console.log('Новое подключение по Wi-Fi');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      // Формируем чистый ответ без лишней вложенности объектов
      const reply = {
        type: data.type || 'message',
        username: data.username || data.name || 'Аноним',
        text: data.text || data.message || ''
      };

      // Рассылаем всем подключенным устройствам в Wi-Fi
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(reply));
        }
      });
    } catch (e) {
      console.log('Ошибка обработки сообщения:', e);
    }
  });

  ws.on('close', () => {
    console.log('Кто-то отключился');
  });
});

// Запуск сервера на порту 3000
server.listen(3000, '0.0.0.0', () => {
  console.log('=== СЕРВЕР ЗАПУЩЕН НА ПОРТУ 3000 ===');
  console.log('Теперь чат работает для всех в одной Wi-Fi сети!');
});