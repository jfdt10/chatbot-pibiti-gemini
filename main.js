const API_KEY = "AIzaSyDnts_zWG7Ij0ZwZxf3zpJNp0_i8nuaZ9U"; // <- cole sua chave aqui

const entendimentoInfo = `
Seu sistema atua como assistente educacional de programação, guiando o estudante nas etapas de entendimento do enunciado conforme o modelo de Polya.
... (resuma ou mantenha o conteúdo que você usou anteriormente)
`;

const chatWindow = document.getElementById('chatWindow');
const chatBtn = document.getElementById('chatBtn');
const closeBtn = document.getElementById('closeBtn');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const chatMessages = document.getElementById('chatMessages');

let model = null;

function toggleChat() {
    chatWindow.classList.toggle('open');
    if (chatWindow.classList.contains('open')) {
        messageInput.focus();
    }
}

function addMessage(content, isUser = false, isError = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user' : isError ? 'error' : 'bot'}`;
    messageDiv.textContent = content;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showTyping() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';
    typingDiv.id = 'typing';
    typingDiv.innerHTML = `
        <div class="typing-dots">
            <span></span><span></span><span></span>
        </div>`;
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function hideTyping() {
    const typing = document.getElementById('typing');
    if (typing) typing.remove();
}

async function sendMessage() {
    const message = messageInput.value.trim();
    if (!message) return;

    messageInput.disabled = true;
    sendBtn.disabled = true;

    addMessage(message, true);
    messageInput.value = '';
    showTyping();

    try {
        let text = "Isso é uma resposta simulada do assistente.";
        if (model) {
            const result = await model.generateContent(message);
            const response = await result.response;
            text = response.text();
        }
        hideTyping();
        addMessage(text);
    } catch (error) {
        console.error("Erro:", error);
        hideTyping();
        addMessage("Desculpe, ocorreu um erro ao consultar a API.", false, true);
    }

    messageInput.disabled = false;
    sendBtn.disabled = false;
    messageInput.focus();
}

chatBtn.addEventListener('click', toggleChat);
closeBtn.addEventListener('click', toggleChat);
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Inicialização dinâmica da API
async function initAPI() {
    if (!API_KEY) {
        console.warn("Nenhuma chave da API definida. Usando modo simulado.");
        return;
    }

    try {
        const { GoogleGenerativeAI } = await import("https://esm.run/@google/generative-ai");
        const genAI = new GoogleGenerativeAI(API_KEY);
        model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            systemInstruction: entendimentoInfo
        });
        console.log("API carregada com sucesso.");
    } catch (error) {
        console.error("Erro ao carregar a API do Gemini:", error);
    }
}

initAPI();
