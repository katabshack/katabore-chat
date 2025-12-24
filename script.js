document.addEventListener('DOMContentLoaded', () => {
    // --- Gardien d'authentification ---
    const session = JSON.parse(localStorage.getItem('supabase.auth.token'));
    if (!session || !session.access_token || (session.expires_at * 1000 < Date.now())) {
        localStorage.removeItem('supabase.auth.token');
        window.location.href = 'login.html';
        return;
    }
    const authToken = session.access_token;

    // --- Initialisation des variables DOM ---
    const appContainer = document.getElementById('app-container');
    const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
    const headerMenuBtn = document.getElementById('header-menu-btn');
    const headerMenuContainer = document.getElementById('header-menu-container');
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const newChatBtn = document.querySelector('.new-chat-btn');
    const chatList = document.querySelector('.chat-list');
    const welcomeScreen = document.getElementById('welcome-screen');
    const scrollTopBtn = document.getElementById('scroll-top-btn');
    const scrollBottomBtn = document.getElementById('scroll-bottom-btn');
    const suggestionChips = document.querySelectorAll('.chip');
    const attachFileBtn = document.getElementById('attach-file-btn');
    const fileInput = document.getElementById('file-input');
    const imagePreviewContainer = document.getElementById('image-preview-container');

    const BACKEND_URL = 'http://localhost:3000';

    let chats = [];
    let activeChatId = null;
    let attachedImage = null;

    // --- Fonctions d'API Backend ---
    const fetchWithAuth = async (url, options = {}) => {
        const headers = { ...options.headers, 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' };
        const body = options.body ? JSON.stringify(options.body) : null;
        const response = await fetch(url, { ...options, headers, body });
        if (response.status === 401) {
            localStorage.removeItem('supabase.auth.token');
            window.location.href = 'login.html';
            throw new Error("Session expirée.");
        }
        if (!response.ok) {
            const err = await response.json().catch(() => ({ error: "Erreur serveur" }));
            throw new Error(err.error || "Une erreur est survenue");
        }
        return response.status === 204 ? null : response.json();
    };

    // --- Fonctions de Rendu (affichage) ---
    const renderSidebar = () => {
        chatList.innerHTML = '';
        if (!chats) return;
        chats.forEach(chat => {
            const chatItem = document.createElement('a');
            chatItem.href = '#';
            chatItem.classList.add('chat-item');
            chatItem.dataset.chatId = chat.id;
            chatItem.textContent = chat.title;
            if (chat.id === activeChatId) chatItem.classList.add('active');

            chatItem.addEventListener('click', async (e) => {
                e.preventDefault();
                activeChatId = chat.id;
                await renderChat();
                renderSidebar();
            });
            chatList.appendChild(chatItem);
        });
    };

    const renderChat = async () => {
        const activeChat = chats.find(c => c.id === activeChatId);
        chatBox.innerHTML = '';
        if (!activeChat || String(activeChat.id).startsWith('temp-')) {
            chatBox.appendChild(welcomeScreen);
            welcomeScreen.style.display = 'flex';
            setRandomSuggestions();
            return;
        }
        welcomeScreen.style.display = 'none';
        try {
            const messages = await fetchWithAuth(`${BACKEND_URL}/chats/${activeChat.id}/messages`);
            activeChat.messages = messages;
            messages.forEach(msg => {
                const msgEl = addMessageToDOM(msg.content, msg.sender);
                if (msg.sender === 'bot') finalizeBotMessage(msgEl);
            });
        } catch (error) {
            console.error("Impossible de charger les messages:", error);
        }
    };

    const renderAll = async () => {
        renderSidebar();
        await renderChat();
    };

    // --- Fonctions de logique principale ---
    const startNewChat = () => {
        const newChat = { id: `temp-${Date.now()}`, title: 'Nouvelle Discussion', messages: [] };
        chats.unshift(newChat);
        activeChatId = newChat.id;
        renderAll();
    };

    const deleteChat = async (chatIdToDelete) => {
        try {
            await fetchWithAuth(`${BACKEND_URL}/chats/${chatIdToDelete}`, { method: 'DELETE' });
            await initApp();
        } catch (error) {
            alert("Erreur de suppression");
        }
    };

    // ---- REMPLACEZ DE NOUVEAU TOUTE LA FONCTION sendMessage PAR CELLE-CI ----

    // ---- REMPLACEZ ENCORE TOUTE LA FONCTION sendMessage PAR CELLE-CI ----

    const sendMessage = async () => {
        const messageText = userInput.value.trim();
        if ((messageText === '' && !attachedImage) || sendBtn.disabled) return;

        sendBtn.disabled = true;
        userInput.disabled = true;
        welcomeScreen.style.display = 'none';

        // --- Configuration de l'effet "machine à écrire" ---
        const TYPING_SPEED = 9; // Plus ce chiffre est petit, plus c'est rapide. 1 est le max.
        let characterQueue = [];
        let isStreamingFinished = false;
        let animationFrameId;

        let currentChat = chats.find(c => c.id === activeChatId);

        try {
            if (String(currentChat.id).startsWith('temp-')) {
                const newChatData = await fetchWithAuth(`${BACKEND_URL}/chats`, {
                    method: 'POST',
                    body: { title: messageText.substring(0, 30) || "Nouvelle Discussion" }
                });
                chats[0] = { ...newChatData, messages: [] };
                activeChatId = newChatData.id;
                currentChat = newChatData;
                renderSidebar();
            }

            await fetchWithAuth(`${BACKEND_URL}/messages`, {
                method: 'POST',
                body: { chat_id: currentChat.id, sender: 'user', content: messageText }
            });

            addMessageToDOM(messageText, 'user', attachedImage);
            userInput.value = '';
            userInput.style.height = 'auto';

            const imageToSend = attachedImage;
            clearAttachedImage();

            const botMessageElement = addMessageToDOM('', 'bot');
            const contentContainer = botMessageElement.querySelector('.message-content');
            chatBox.scrollTop = chatBox.scrollHeight;

            // --- Boucle de Rendu pour l'effet machine à écrire ---
            const renderLoop = () => {
                if (characterQueue.length > 0) {
                    const charsToAdd = characterQueue.splice(0, TYPING_SPEED);
                    contentContainer.textContent += charsToAdd.join('');
                    chatBox.scrollTop = chatBox.scrollHeight;
                }
                // Si le streaming n'est pas fini OU si la file n'est pas vide, on continue
                if (!isStreamingFinished || characterQueue.length > 0) {
                    animationFrameId = requestAnimationFrame(renderLoop);
                }
            };

            // On démarre la boucle de rendu
            renderLoop();

            const contents = [{ parts: [] }];
            if (messageText) contents[0].parts.push({ text: messageText });
            if (imageToSend) {
                contents[0].parts.push({
                    inline_data: { mime_type: imageToSend.mimeType, data: imageToSend.data }
                });
            }

            const response = await fetch(`${BACKEND_URL}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ contents })
            });

            if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullBotResponse = "";

            while (true) {
                const { value, done } = await reader.read();
                if (done) {
                    isStreamingFinished = true; // On signale la fin du stream
                    break;
                }

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = JSON.parse(line.substring(6));
                        if (data.botChunk) {
                            fullBotResponse += data.botChunk;
                            // On ajoute les caractères à la file d'attente au lieu de les afficher directement
                            characterQueue.push(...data.botChunk.split(''));
                        }
                        if (data.error) throw new Error(data.error);
                    }
                }
            }

            // Attendre que la file d'attente de l'animation soit vide
            await new Promise(resolve => {
                const checkQueue = () => {
                    if (characterQueue.length === 0) resolve();
                    else setTimeout(checkQueue, 50);
                }
                checkQueue();
            });

            contentContainer.innerHTML = marked.parse(fullBotResponse);
            finalizeBotMessage(botMessageElement);

            await fetchWithAuth(`${BACKEND_URL}/messages`, {
                method: 'POST',
                body: { chat_id: currentChat.id, sender: 'bot', content: fullBotResponse }
            });

        } catch (error) {
            console.error("Erreur dans sendMessage:", error);
            isStreamingFinished = true; // S'assurer d'arrêter la boucle en cas d'erreur
            const botMsg = addMessageToDOM("Oups, une erreur est survenue.", 'bot');
            finalizeBotMessage(botMsg);
        } finally {
            isStreamingFinished = true; // Sécurité pour arrêter la boucle
            cancelAnimationFrame(animationFrameId); // On nettoie l'animation
            sendBtn.disabled = false;
            userInput.disabled = false;
            userInput.focus();
        }
    };


    // --- Fonctions utilitaires ---
    const addMessageToDOM = (text, sender, image) => {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', `${sender}-message`);
        const contentContainer = document.createElement('div');
        contentContainer.classList.add('message-content');
        if (sender === 'user') {
            if (image) {
                const img = document.createElement('img');
                img.src = `data:${image.mimeType};base64,${image.data}`;
                img.className = 'message-image';
                contentContainer.appendChild(img);
            }
            if (text) {
                const p = document.createElement('p');
                p.textContent = text;
                contentContainer.appendChild(p);
            }
            messageElement.appendChild(contentContainer);
            const actionsContainer = document.createElement('div');
            actionsContainer.classList.add('message-actions');
            const copyBtn = createActionButton(`<svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`, "Copier");
            copyBtn.onclick = () => navigator.clipboard.writeText(text);
            actionsContainer.appendChild(copyBtn);
            messageElement.appendChild(actionsContainer);
        } else {
            contentContainer.innerHTML = marked.parse(text);
            messageElement.appendChild(contentContainer);
        }
        chatBox.appendChild(messageElement);
        return messageElement;
    };

    const showTypingIndicator = () => {
        if (document.querySelector('.typing-indicator')) return;
        const indicator = document.createElement('div');
        indicator.className = 'message bot-message typing-indicator';
        indicator.innerHTML = '<span></span><span></span><span></span>';
        chatBox.appendChild(indicator);
        indicator.scrollIntoView({ behavior: 'smooth', block: 'end' });
    };

    const hideTypingIndicator = () => {
        const indicator = document.querySelector('.typing-indicator');
        if (indicator) indicator.remove();
    };

    const createActionButton = (svg, title) => {
        const button = document.createElement('button');
        button.classList.add('action-btn');
        button.title = title;
        button.innerHTML = svg;
        return button;
    };

    const finalizeBotMessage = (botMessageElement) => {
        const contentContainer = botMessageElement.querySelector('.message-content');
        contentContainer.querySelectorAll('pre').forEach(pre => {
            if (pre.parentNode.classList.contains('code-block-wrapper')) return;
            const wrapper = document.createElement('div');
            wrapper.classList.add('code-block-wrapper');
            pre.parentNode.insertBefore(wrapper, pre);
            wrapper.appendChild(pre);
            const copyBtn = createActionButton('Copier', 'Copier le code');
            copyBtn.className = 'copy-btn';
            copyBtn.onclick = () => {
                navigator.clipboard.writeText(pre.querySelector('code').innerText);
                copyBtn.textContent = 'Copié !';
                setTimeout(() => { copyBtn.textContent = 'Copier'; }, 2000);
            };
            wrapper.appendChild(copyBtn);
        });

        const actionsContainer = document.createElement('div');
        actionsContainer.classList.add('message-actions');
        const textToCopy = contentContainer.innerText;
        const copyBtn = createActionButton(`<svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`, "Copier");
        copyBtn.onclick = () => navigator.clipboard.writeText(textToCopy);
        const likeBtn = createActionButton(`<svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg>`, "J'aime");
        const dislikeBtn = createActionButton(`<svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14-.47-.14-.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41-.17-.79-.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/></svg>`, "Je n'aime pas");
        likeBtn.onclick = () => { likeBtn.classList.toggle('liked'); dislikeBtn.classList.remove('disliked'); };
        dislikeBtn.onclick = () => { dislikeBtn.classList.toggle('disliked'); likeBtn.classList.remove('liked'); };
        const speakBtn = createActionButton(`<svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`, "Lire le texte");
        speakBtn.onclick = () => {
            if (speechSynthesis.speaking) {
                speechSynthesis.cancel();
                speakBtn.classList.remove('speaking');
            } else {
                const utterance = new SpeechSynthesisUtterance(textToCopy);
                utterance.lang = 'fr-FR';
                utterance.onend = () => speakBtn.classList.remove('speaking');
                speechSynthesis.speak(utterance);
                speakBtn.classList.add('speaking');
            }
        };
        actionsContainer.append(copyBtn, likeBtn, dislikeBtn, speakBtn);
        botMessageElement.appendChild(actionsContainer);
    };

    const suggestionPrompts = ["Donne-moi 3 idées de noms de projet", "Génère un squelette HTML/CSS", "Explique le concept de l'IA", "Rédige un poème sur la technologie", "Quel est le plat typique du Canada ?", "Propose un titre pour un article de blog", "Comment fonctionne un trou noir ?", "Écris une ligne de code JavaScript qui inverse une chaîne", "Quelle est la capitale de l'Australie ?", "Donne-moi une recette de cuisine rapide"];
    const setRandomSuggestions = () => {
        const shuffled = [...suggestionPrompts].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 3);
        suggestionChips.forEach((chip, index) => { chip.textContent = selected[index]; });
    };

    const createHeaderMenu = () => {
        closeAllMenus();
        const menu = document.createElement('div');
        menu.className = 'header-menu';
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Supprimer le chat';
        deleteButton.onclick = () => {
            if (confirm("Êtes-vous sûr de vouloir supprimer cette discussion ?")) {
                deleteChat(activeChatId);
            }
            closeAllMenus();
        };
        menu.appendChild(deleteButton);
        headerMenuContainer.appendChild(menu);
        return menu;
    };

    const closeAllMenus = () => {
        const existingMenu = headerMenuContainer.querySelector('.header-menu');
        if (existingMenu) existingMenu.remove();
    };

    const handleImageAttachment = (file) => {
        if (!file || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result.replace(/^data:.+;base64,/, '');
            attachedImage = { mimeType: file.type, data: base64String };
            imagePreviewContainer.innerHTML = `<img src="${reader.result}" alt="Prévisualisation">`;
        };
        reader.readAsDataURL(file);
    };

    const clearAttachedImage = () => {
        attachedImage = null;
        fileInput.value = '';
        imagePreviewContainer.innerHTML = '';
    };

    // --- Écouteurs d'événements ---
    toggleSidebarBtn.addEventListener('click', () => {
        appContainer.classList.toggle('sidebar-collapsed');
    });

    headerMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const existingMenu = headerMenuContainer.querySelector('.header-menu');
        if (existingMenu) {
            closeAllMenus();
        } else {
            const menu = createHeaderMenu();
            menu.classList.add('show');
        }
    });

    attachFileBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleImageAttachment(e.target.files[0]);
        }
    });

    newChatBtn.addEventListener('click', startNewChat);
    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });
    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = `${userInput.scrollHeight}px`;
    });

    userInput.addEventListener('paste', (e) => {
        const items = (e.clipboardData || window.clipboardData).items;
        for (const item of items) {
            if (item.type.indexOf('image') !== -1) {
                const file = item.getAsFile();
                if (file) handleImageAttachment(file);
                e.preventDefault();
                return;
            }
        }
    });

    scrollTopBtn.addEventListener('click', () => {
        const firstMessage = chatBox.querySelector('.message');
        if (firstMessage) {
            firstMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });

    scrollBottomBtn.addEventListener('click', () => {
        const messages = chatBox.querySelectorAll('.message');
        if (messages.length > 0) {
            messages[messages.length - 1].scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    });
    suggestionChips.forEach(chip => {
        chip.addEventListener('click', () => {
            userInput.value = chip.textContent;
            sendMessage();
        });
    });
    window.addEventListener('click', closeAllMenus);

    // --- Initialisation ---
    const initApp = async () => {
        try {
            // Remplace loadChats par l'appel au backend
            chats = await fetchWithAuth(`${BACKEND_URL}/chats`);
            if (chats.length > 0) {
                activeChatId = chats[0].id;
            } else {
                // Si l'utilisateur n'a aucun chat, on en crée un temporaire
                startNewChat();
                return;
            }
            await renderAll();
        } catch (error) {
            console.error("Erreur d'initialisation:", error);
        }
    };

    initApp();
});