const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { WebSocketServer } = require('ws'); // Подключаем WebSocket

const app = express();
app.use(cors());
app.use(bodyParser.json());

let globalLeaders = [];
let chatMessages = []; // Тут храним историю чата

// Запись рекорда
app.post('/api/score', (req, res) => {
  const { username, wpm } = req.body;
  if (!username) return res.status(400).json({ success: false });

  const existingPlayer = globalLeaders.find(p => p.name === username);
  if (existingPlayer) {
    if (wpm > existingPlayer.wpm) {
      existingPlayer.wpm = wpm;
    }
  } else {
    globalLeaders.push({ name: username, wpm: wpm });
  }

  globalLeaders.sort((a, b) => b.wpm - a.wpm);
  res.json({ success: true, leaders: globalLeaders });
});

// Получение рейтинга
app.get('/api/leaders', (req, res) => {
  res.json({ leaders: globalLeaders });
});

// Запуск HTTP сервера
const server = app.listen(3000, () => {
  console.log('🚀 Сервер запущен на http://localhost:3000');
});

// НАСТРОЙКА WEBSOCKET ДЛЯ ЧАТА
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  // Как только пользователь зашел — отправляем ему историю сообщений
  ws.send(JSON.stringify({ type: 'history', messages: chatMessages }));

  ws.on('message', (data) => {
    try {
      const parsed = JSON.parse(data);
      
      if (parsed.type === 'message') {
        const newMsg = { username: parsed.username, text: parsed.text };
        chatMessages.push(newMsg); // Сохраняем в историю

        // Ограничим историю до 50 сообщений, чтобы не забивать память
        if (chatMessages.length > 50) chatMessages.shift();

        // Отправляем это сообщение ВООБЩЕ ВСЕМ подключенным пользователям
        wss.clients.forEach((client) => {
          if (client.readyState === 1) { // 1 означает OPEN
            client.send(JSON.stringify({ type: 'new_message', message: newMsg }));
          }
        });
      }
    } catch (err) {
      console.error('Ошибка обработки сообщения:', err);
    }
  });
});