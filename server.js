const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');

const app = express();
const port = 3000;

// --- CONFIGURATION API ---
// REMPLACE CECI PAR TA CLÉ API :
const GEN_AI_KEY = "AIzaSyCYzk0oVuSARZT9ny9Xts0NSmYG7S3ZfzY"; 

const genAI = new GoogleGenerativeAI(GEN_AI_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

app.use(cors());
app.use(express.json({ limit: '10mb' }));
// Sert les fichiers HTML/CSS/JS statiques
app.use(express.static(path.join(__dirname)));

// --- BASE DE DONNÉES EN MÉMOIRE (Simulée pour le projet GitHub) ---
let users = [];
let chats = [];
let messages = {};

// --- AUTHENTIFICATION ---
app.post('/auth/signup', (req, res) => {
    const { email, password } = req.body;
    if (users.find(u => u.email === email)) return res.status(400).json({ error: "Utilisateur déjà existant" });
    const newUser = { id: Date.now().toString(), email, password };
    users.push(newUser);
    res.status(200).json({ message: "Succès" });
});

app.post('/auth/login', (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) return res.status(401).json({ error: "Identifiants incorrects" });
    
    // Fausse session pour tromper le frontend
    const session = { access_token: "fake-token", user: { email: user.email, id: user.id }, expires_at: Date.now() + 36000 };
    res.json({ session });
});

// --- GESTION DES CHATS ---
app.get('/chats', (req, res) => res.json(chats.reverse()));

app.post('/chats', (req, res) => {
    const newChat = { id: Date.now().toString(), title: req.body.title || "Nouveau Chat", created_at: new Date() };
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

// --- IA GEMINI (Streaming) ---
app.post('/api/chat', async (req, res) => {
    try {
        const { contents } = req.body;
        const userMessage = contents[0].parts[0].text;
        const imageData = contents[0].parts[1]; 

        let result;
        if (imageData) {
            const imagePart = { inlineData: { data: imageData.inline_data.data, mimeType: imageData.inline_data.mime_type } };
            result = await model.generateContentStream([userMessage, imagePart]);
        } else {
            result = await model.generateContentStream(userMessage);
        }

        res.setHeader('Content-Type', 'text/event-stream');
        for await (const chunk of result.stream) {
            res.write(`data: ${JSON.stringify({ botChunk: chunk.text() })}\n\n`);
        }
        res.end();
    } catch (error) {
        console.error("Erreur API:", error);
        res.write(`data: ${JSON.stringify({ error: "Erreur IA" })}\n\n`);
        res.end();
    }
});

app.listen(port, () => {
    console.log(`🚀 Katabore Chat lancé sur http://localhost:${port}`);
});