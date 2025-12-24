# 🤖 Katabore Chat

Un clone de chat IA moderne et responsive, propulsé par l'API Google Gemini.
Ce projet permet de discuter avec une IA, de gérer plusieurs conversations et de conserver un historique (session temporaire).

<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/86fd8c66-a725-4ce1-a064-511f21ed9f62" />


## ✨ Fonctionnalités

- 💬 **Discussion en temps réel** avec Gemini (Streaming textuel).
- 🧠 **Mémoire contextuelle** : L'IA se souvient de ce que vous avez dit plus tôt.
- 🎨 **Interface Moderne** : Thème sombre (Dark Mode), responsive et animations fluides.
- 🔐 **Authentification** : Système de création de compte et de connexion (Stockage en mémoire pour la démo).
- 🗑️ **Gestion des chats** : Création, historique et suppression de conversations.
- 📸 **Analyse d'images** : Possibilité d'envoyer des images à l'IA.

## 🚀 Installation

1. **Cloner le projet**

         git clone https://github.com/TON_PSEUDO/katabore-chat.git
         cd katabore-chat

2. **Installer les dépendances**

               npm install
      
3. **Configurer la Clé API**

Créez un fichier .env à la racine.

Ajoutez votre clé Google Gemini :

      API_KEY=Votre_Cle_API_Ici

4. **Lancer le serveur**

               npm run dev

Rendez-vous sur http://localhost:3000.

🛠️ Technologies
Frontend : HTML5, CSS3, JavaScript (Vanilla).
Backend : Node.js, Express.
IA : Google Generative AI SDK.
