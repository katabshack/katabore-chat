document.addEventListener('DOMContentLoaded', () => {
    // --- AUTHENTIFICATION ---
    const session = JSON.parse(localStorage.getItem('supabase.auth.token'));
    if (!session || !session.user) {
        window.location.href = 'login.html';
        return;
    }
    const userId = session.user.id;

    // --- DOM ELEMENTS ---
    const appContainer = document.getElementById('app-container');
    const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
    const deleteChatBtn = document.getElementById('delete-chat-btn');
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const newChatBtn = document.querySelector('.new-chat-btn');
    const chatList = document.querySelector('.chat-list');
    const welcomeScreen = document.getElementById('welcome-screen');
    const scrollBottomBtn = document.getElementById('scroll-bottom-btn'); // Le bouton bas
    const attachFileBtn = document.getElementById('attach-file-btn');
    const fileInput = document.getElementById('file-input');
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const suggestionChips = document.querySelectorAll('.chip'); // Les suggestions
    
    // Modal Elements
    const deleteModal = document.getElementById('delete-modal');
    const confirmDeleteBtn = document.getElementById('confirm-delete');
    const cancelDeleteBtn = document.getElementById('cancel-delete');

    const BACKEND_URL = window.location.origin;

    let chats = [];
    let activeChatId = null;
    let attachedImage = null;

    // --- FETCH CORRIGÉ (Règle le bug "[object Object]") ---
    const fetchWithAuth = async (url, options = {}) => {
        const headers = { 
            ...options.headers, 
            'Content-Type': 'application/json',
            'x-user-id': userId 
        };

        // CORRECTION IMPORTANTE : On convertit le body en string JSON si c'est un objet
        if (options.body && typeof options.body === 'object') {
            options.body = JSON.stringify(options.body);
        }

        const response = await fetch(url, { ...options, headers });
        if (!response.ok) throw new Error("Erreur réseau");
        return response.status === 204 ? null : response.json();
    };

    // --- LOGIQUE CHAT ---
    const renderSidebar = () => {
        chatList.innerHTML = '';
        chats.forEach(chat => {
            const chatItem = document.createElement('a');
            chatItem.href = '#';
            chatItem.classList.add('chat-item');
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
        
        // Si c'est un nouveau chat ou temporaire
        if (!activeChat || String(activeChat.id).startsWith('temp-')) {
            chatBox.appendChild(welcomeScreen);
            welcomeScreen.style.display = 'flex';
            if(deleteChatBtn) deleteChatBtn.style.display = 'none'; // Cache la poubelle
            return;
        }
        
        welcomeScreen.style.display = 'none';
        if(deleteChatBtn) deleteChatBtn.style.display = 'block'; // Affiche la poubelle

        try {
            const messages = await fetchWithAuth(`${BACKEND_URL}/chats/${activeChat.id}/messages`);
            messages.forEach(msg => {
                const msgEl = addMessageToDOM(msg.content, msg.sender);
                if (msg.sender === 'bot') finalizeBotMessage(msgEl);
            });
            scrollToBottom();
        } catch (error) {
            console.error("Erreur chargement messages", error);
        }
    };

    const startNewChat = () => {
        const newChat = { id: `temp-${Date.now()}`, title: 'Nouvelle Discussion' };
        chats.unshift(newChat);
        activeChatId = newChat.id;
        renderSidebar();
        renderChat();
    };

    // --- LISTENERS SUGGESTIONS (CORRIGÉ) ---
    suggestionChips.forEach(chip => {
        chip.addEventListener('click', () => {
            userInput.value = chip.textContent;
            sendMessage();
        });
    });

    // --- SUPPRESSION ---
    if(deleteChatBtn) {
        deleteChatBtn.addEventListener('click', () => {
            if (!activeChatId || String(activeChatId).startsWith('temp-')) return;
            deleteModal.classList.add('active');
        });
    }

    if(cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', () => deleteModal.classList.remove('active'));

    if(confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', async () => {
        try {
            await fetchWithAuth(`${BACKEND_URL}/chats/${activeChatId}`, { method: 'DELETE' });
            deleteModal.classList.remove('active');
            await initApp(); 
        } catch (error) {
            alert("Erreur lors de la suppression");
        }
    });

    // --- ENVOI MESSAGES ---
    const sendMessage = async () => {
        const messageText = userInput.value.trim();
        if ((messageText === '' && !attachedImage) || sendBtn.disabled) return;

        sendBtn.disabled = true;
        userInput.disabled = true;
        welcomeScreen.style.display = 'none';

        let currentChat = chats.find(c => c.id === activeChatId);

        try {
            if (String(currentChat.id).startsWith('temp-')) {
                const newChatData = await fetchWithAuth(`${BACKEND_URL}/chats`, {
                    method: 'POST',
                    body: { title: messageText.substring(0, 30) || "Conversation" }
                });
                const tempIndex = chats.findIndex(c => c.id === currentChat.id);
                chats[tempIndex] = newChatData;
                activeChatId = newChatData.id;
                currentChat = newChatData;
                renderSidebar();

                if(deleteChatBtn) deleteChatBtn.style.display = 'block'; 
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

            showTypingIndicator();
            scrollToBottom();

            const contents = [{ parts: [] }];
            if (messageText) contents[0].parts.push({ text: messageText });
            if (imageToSend) contents[0].parts.push({ inline_data: { mime_type: imageToSend.mimeType, data: imageToSend.data } });

            const response = await fetch(`${BACKEND_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // JSON.stringify est géré par fetchWithAuth, mais ici on utilise fetch direct pour le streaming
                body: JSON.stringify({ contents, chatId: currentChat.id }) 
            });

            hideTypingIndicator();

            const botMessageElement = addMessageToDOM('', 'bot');
            const contentContainer = botMessageElement.querySelector('.message-content');
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullBotResponse = "";

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = JSON.parse(line.substring(6));
                        if (data.botChunk) {
                            fullBotResponse += data.botChunk;
                            contentContainer.innerHTML = marked.parse(fullBotResponse);
                            scrollToBottom();
                        }
                    }
                }
            }

            finalizeBotMessage(botMessageElement);
            await fetchWithAuth(`${BACKEND_URL}/messages`, {
                method: 'POST',
                body: { chat_id: currentChat.id, sender: 'bot', content: fullBotResponse }
            });

        } catch (error) {
            hideTypingIndicator();
            console.error(error);
            addMessageToDOM("Désolé, une erreur est survenue.", 'bot');
        } finally {
            sendBtn.disabled = false;
            userInput.disabled = false;
            userInput.focus();
        }
    };

    // --- SCROLL INTELLIGENT (Uniquement bouton bas) ---
    const scrollToBottom = () => {
        chatBox.scrollTop = chatBox.scrollHeight;
    };

    chatBox.addEventListener('scroll', () => {
        // Si on n'est pas tout en bas, on affiche le bouton
        const distanceToBottom = chatBox.scrollHeight - chatBox.scrollTop - chatBox.clientHeight;
        if (distanceToBottom > 150) {
            scrollBottomBtn.classList.add('show');
        } else {
            scrollBottomBtn.classList.remove('show');
        }
    });

    if(scrollBottomBtn) {
        scrollBottomBtn.addEventListener('click', () => {
            chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: 'smooth' });
        });
    }

    // --- UTILITAIRES ---
    const addMessageToDOM = (text, sender, image) => {
        const div = document.createElement('div');
        div.className = `message ${sender}-message`;
        const content = document.createElement('div');
        content.className = 'message-content';
        if (image) {
            const img = document.createElement('img');
            img.src = `data:${image.mimeType};base64,${image.data}`;
            img.className = 'message-image';
            content.appendChild(img);
        }
        if (sender === 'bot') content.innerHTML = marked.parse(text);
        else content.textContent = text;
        div.appendChild(content);
        chatBox.appendChild(div);
        return div;
    };

    const finalizeBotMessage = (element) => {};

    const showTypingIndicator = () => {
        if (document.querySelector('.typing-indicator')) return;
        const div = document.createElement('div');
        div.className = 'message bot-message typing-indicator';
        div.innerHTML = '<span></span><span></span><span></span>';
        chatBox.appendChild(div);
    };

    const hideTypingIndicator = () => {
        const el = document.querySelector('.typing-indicator');
        if (el) el.remove();
    };

    const handleImageAttachment = (file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            attachedImage = { mimeType: file.type, data: base64 };
            imagePreviewContainer.innerHTML = `<img src="${reader.result}">`;
        };
        reader.readAsDataURL(file);
    };

    const clearAttachedImage = () => {
        attachedImage = null;
        fileInput.value = '';
        imagePreviewContainer.innerHTML = '';
    };

    // --- INITIALISATION ---
    toggleSidebarBtn.addEventListener('click', () => appContainer.classList.toggle('sidebar-collapsed'));
    newChatBtn.addEventListener('click', startNewChat);
    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
    attachFileBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => handleImageAttachment(e.target.files[0]));

    const initApp = async () => {
        try {
            chats = await fetchWithAuth(`${BACKEND_URL}/chats`);
            if (chats.length === 0) startNewChat();
            else {
                activeChatId = chats[0].id;
                renderSidebar();
                renderChat();
            }
        } catch (e) { console.error(e); }
    };

    initApp();
});