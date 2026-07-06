const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { WebSocketServer } = require('ws');

const app = express();
app.use(cors());
app.use(bodyParser.json());

let globalLeaders = []; 
let chatMessages = [];  

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

const server = app.listen(3000, () => {
    console.log('🚀 Сервер Typing Test запущен на http://localhost:3000');
});

// WebSocket для живого чата
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
    ws.send(JSON.stringify({ type: 'history', messages: chatMessages }));

    ws.on('message', (data) => {
        try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'message') {
                const newMessage = {
                    username: parsed.username,
                    text: parsed.text,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                };
                
                chatMessages.push(newMessage);
                if (chatMessages.length > 50) chatMessages.shift();

                const broadcastData = JSON.stringify({ type: 'new_message', message: newMessage });
                wss.clients.forEach(client => {
                    if (client.readyState === ws.OPEN) {
                        client.send(broadcastData);
                    }
                });
            }
        } catch (e) {
            console.error(e);
        }
    });
});