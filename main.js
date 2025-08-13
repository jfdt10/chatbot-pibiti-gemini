const API_KEY = "AIzaSyC_EiB1UcZKAyY4gqPonBAgbLRBVq3bFJU"; // <- cole sua chave aqui

// Link CSV 
const URL_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSdy74VMFCuowXzxgtAcYPDLmU6cj4crafrcd5DrvbltDRYN-_2JbaJZonYOK710n8sVUOhwS5bf9Tl/pub?output=csv";  // troque pelo seu link

let dadosPlanilha = [];

async function lerCSV(url) {
    const resp = await fetch(url);
    const text = await resp.text();
    const linhas = text.trim().split("\n").map(linha => linha.split(","));
    return linhas;
}

const entendimentoInfo = `
Seu sistema atua como assistente educacional de programação. 
O fluxo é: perguntar o número da questão, ler a questão da planilha e explicar sobre o que se trata.
`;

const chatWindow = document.getElementById('chatWindow');
const chatBtn = document.getElementById('chatBtn');
const closeBtn = document.getElementById('closeBtn');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const chatMessages = document.getElementById('chatMessages');

let model = null;
let aguardandoNumeroQuestao = true;

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

    addMessage(message, true);
    messageInput.value = '';
    showTyping();

    try {
        let text = "";

        if (aguardandoNumeroQuestao) {
            // Verifica se o que foi digitado é um número válido
            const numero = parseInt(message);
            if (!isNaN(numero) && numero >= 2 && numero <= 42) {
                aguardandoNumeroQuestao = false;
                const questao = dadosPlanilha[numero - 1][0];
                text = `A questão ${numero} diz: "${questao}". Agora vou te explicar sobre o que ela trata.`;

                // Consulta ao modelo para explicar
                if (model) {
                    const result = await model.generateContent(`Explique para um estudante iniciante: ${questao}`);
                    const response = await result.response;
                    text += "\n\n" + response.text();
                }
            } else {
                text = "Por favor, digite um número de questão entre 2 e 42.";
            }
        } else {
    
            if (model) {
                const result = await model.generateContent(message);
                const response = await result.response;
                text = response.text();
            }
        }

        hideTyping();
        addMessage(text);

    } catch (error) {
        console.error("Erro:", error);
        hideTyping();
        addMessage("Desculpe, ocorreu um erro ao processar sua solicitação.", false, true);
    }

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

async function initAPI() {
    if (!API_KEY) {
        console.warn("Nenhuma chave da API definida. Usando modo simulado.");
    } else {
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

    dadosPlanilha = await lerCSV(URL_CSV);
    addMessage("Olá! Me diga o número da questão que você quer ajuda (2 a 42).");
}

initAPI();