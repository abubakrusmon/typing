const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Массив для хранения истории последних 50 сообщений
let messageHistory = [];
// Массив для хранения рекордов (из твоего основного кода)
let leaderboards = [];

// API для сохранения рекордов скорости печати
app.post('/api/score', (req, res) => {
  const { username, wpm } = req.body;
  if (!username) return res.status(400).json({ error: 'No username' });
  
  leaderboards.push({ name: username, wpm: parseInt(wpm) || 0 });
  leaderboards.sort((a, b) => b.wpm - a.wpm);
  leaderboards = leaderboards.slice(0, 10); // оставляем топ-10
  
  res.json({ success: true });
});

// API для получения таблицы лидеров
app.get('/api/leaders', (req, res) => {
  res.json({ leaders: leaderboards });
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  // При подключении нового пользователя отправляем ему историю чата
  ws.send(JSON.stringify({
    type: 'history',
    messages: messageHistory
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'message') {
        const newMsg = {
          username: data.username || 'Аноним',
          text: data.text
        };

        // Сохраняем в историю
        messageHistory.push(newMsg);
        if (messageHistory.length > 50) messageHistory.shift();

        // Рассылаем сообщение ВСЕМ подключенным пользователям
        const broadcastData = JSON.stringify({
          type: 'new_message',
          message: newMsg
        });

        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(broadcastData);
          }
        });
      }
    } catch (e) {
      console.error("Ошибка обработки сообщения:", e);
    }
  });
});

// Запуск сервера на порту 3000
server.listen(3000, () => {
  console.log('Сервер успешно запущен на http://localhost:3000');
});