const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
require('dotenv').config();

const app = express();
const port = 3000;

const GEN_AI_KEY = process.env.API_KEY;
if (!GEN_AI_KEY) {
    console.error("❌ ERREUR : Clé API manquante dans .env");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEN_AI_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3-pro-preview" });

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

// --- BASE DE DONNÉES EN MÉMOIRE ---
let users = [];
let chats = [];
let messages = {}; 

// --- AUTHENTIFICATION ---
app.post('/auth/signup', (req, res) => {
    const { email, password } = req.body;
    if (users.find(u => u.email === email)) return res.status(400).json({ error: "Existe déjà" });
    const newUser = { id: Date.now().toString(), email, password };
    users.push(newUser);
    res.status(200).json({ message: "Succès" });
});

app.post('/auth/login', (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) return res.status(401).json({ error: "Erreur login" });
    // On envoie l'ID utilisateur dans la session pour que le frontend puisse l'utiliser
    res.json({ session: { access_token: "fake-token", user: { email: user.email, id: user.id }, expires_at: Date.now() + 36000 } });
});

// --- GESTION DES CHATS (SÉPARÉS PAR USER) ---

// 1. Récupérer les chats (Filtré par User ID)
app.get('/chats', (req, res) => {
    const userId = req.headers['x-user-id']; // Le frontend enverra l'ID ici
    if (!userId) return res.json([]);
    
    const userChats = chats.filter(c => c.userId === userId);
    // Tri du plus récent au plus ancien
    userChats.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    res.json(userChats);
});

// 2. Créer un chat (Associé à un User ID)
app.post('/chats', (req, res) => {
    const userId = req.headers['x-user-id'];
    const newChat = { 
        id: Date.now().toString(), 
        userId: userId, // On lie le chat à l'utilisateur
        title: req.body.title || "Nouveau Chat", 
        created_at: new Date() 
    };
    chats.push(newChat);
    messages[newChat.id] = [];
    res.json(newChat);
});

app.delete('/chats/:id', (req, res) => {
    chats = chats.filter(c => c.id !== req.params.id);
    delete messages[req.params.id];
    res.status(204).send();
});

app.get('/chats/:id/messages', (req, res) => res.json(messages[req.params.id] || []));

app.post('/messages', (req, res) => {
    const { chat_id, sender, content } = req.body;
    if (!messages[chat_id]) messages[chat_id] = [];
    const msg = { id: Date.now(), chat_id, sender, content };
    messages[chat_id].push(msg);
    res.json(msg);
});

// --- IA GEMINI ---
app.post('/api/chat', async (req, res) => {
    try {
        const { contents, chatId } = req.body;
        const userMessage = contents[0]?.parts[0]?.text || "";
        const imageData = contents[0]?.parts[1];

        // Mémoire
        const previousMessages = messages[chatId] || [];
        const history = previousMessages.map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        }));

        const chat = model.startChat({ history: history });
        let result;

        if (imageData) {
             const imagePart = { inlineData: { data: imageData.inline_data.data, mimeType: imageData.inline_data.mime_type } };
            result = await model.generateContentStream([userMessage, imagePart]);
        } else {
            result = await chat.sendMessageStream(userMessage);
        }

        res.setHeader('Content-Type', 'text/event-stream');
        for await (const chunk of result.stream) {
            res.write(`data: ${JSON.stringify({ botChunk: chunk.text() })}\n\n`);
        }
        res.end();
    } catch (error) {
        console.error("Erreur IA:", error);
        res.write(`data: ${JSON.stringify({ error: "Erreur IA" })}\n\n`);
        res.end();
    }
});

app.listen(port, () => {
    console.log(`🚀 Katabore Chat lancé sur http://localhost:${port}`);
});