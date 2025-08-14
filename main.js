const API_KEY = "AIzaSyDnts_zWG7Ij0ZwZxf3zpJNp0_i8nuaZ9U"; 

// Link CSV da planilha
const URL_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSdy74VMFCuowXzxgtAcYPDLmU6cj4crafrcd5DrvbltDRYN-_2JbaJZonYOK710n8sVUOhwS5bf9Tl/pub?output=csv";

let dadosPlanilha = [];
async function lerCSV(url) {
    const resp = await fetch(url);
    const text = await resp.text();
    const linhas = text.trim().split("\n").map(l => l.split(","));
    return linhas;
}

const entendimentoInfo = `
Você é um assistente educacional de programação que segue a metodologia de Polya.
Fluxo para cada questão:
1. Perguntar as ENTRADAS do problema e validar.
2. Perguntar as SAÍDAS do problema e validar.
3. Perguntar as RESTRIÇÕES e validar.
4. Conduzir o aluno a propor um PLANO DE DESENVOLVIMENTO da solução.
Sempre dê dicas se a resposta estiver incompleta ou incorreta.
`;

const chatWindow = document.getElementById('chatWindow');
const chatBtn = document.getElementById('chatBtn');
const closeBtn = document.getElementById('closeBtn');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const chatMessages = document.getElementById('chatMessages');

let model = null;
let currentStep = null;
let questaoAtual = "";

// ---------------------- Interface ----------------------

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

// ---------------------- API ----------------------

async function sendToAPI(message, context = "") {
    showTyping();
    try {
        let text = "Isso é uma resposta simulada.";
        if (model) {
            const result = await model.generateContent(`${context}\nQuestão: ${questaoAtual}\nAluno: ${message}`);
            const response = await result.response;
            text = response.text();
        }
        hideTyping();
        addMessage(text);
    } catch (error) {
        console.error("Erro:", error);
        hideTyping();
        addMessage("Erro ao consultar a API.", false, true);
    }
}

// ---------------------- Fluxo ----------------------

async function sendMessage() {
    const message = messageInput.value.trim();
    if (!message) return;

    addMessage(message, true);
    messageInput.value = '';

    // Caso inicial: aluno escolhe a questão
    if (!questaoAtual) {
        const numero = parseInt(message);
        if (!isNaN(numero) && numero >= 2 && numero <= 42) {
            questaoAtual = dadosPlanilha[numero - 1][0];
            addMessage(`Questão ${numero}: "${questaoAtual}"`);
            addMessage("Vamos começar a etapa de entendimento.\nQuais são as ENTRADAS (dados) que o programa receberá?");
            currentStep = "entendimento_input";
        } else {
            addMessage("Digite um número de questão válido (2 a 42).", false, true);
        }
        return;
    }

    // Etapas de Polya
    if (currentStep === "entendimento_input") {
        sendToAPI(message, "Valide se estas entradas fazem sentido.");
        currentStep = "entendimento_output";
        addMessage("Agora, quais serão as SAÍDAS (resultados) do programa?");
        return;
    }

    if (currentStep === "entendimento_output") {
        sendToAPI(message, "Valide se esta saída é adequada.");
        currentStep = "entendimento_condicoes";
        addMessage("Por fim, existem RESTRIÇÕES ou CONDIÇÕES especiais?");
        return;
    }

    if (currentStep === "entendimento_condicoes") {
        sendToAPI(message, "Valide estas restrições ou condições.");
        currentStep = "desenvolvimento";
        addMessage("Ótimo! Agora vamos para a etapa de DESENVOLVIMENTO.\nDescreva como você resolveria este problema.");
        return;
    }

    if (currentStep === "desenvolvimento") {
        sendToAPI(message, "Analise este plano de resolução e sugira melhorias.");
        currentStep = null;
        addMessage("Muito bem! Finalizamos todas as etapas para esta questão.");
        return;
    }

    // fallback
    sendToAPI(message);
}

// ---------------------- Eventos ----------------------

chatBtn.addEventListener('click', toggleChat);
closeBtn.addEventListener('click', toggleChat);
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// ---------------------- Inicialização ----------------------

async function initAPI() {
    if (!API_KEY) {
        console.warn("Nenhuma chave definida. Usando modo simulado.");
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
            console.error("Erro ao carregar a API:", error);
        }
    }

    dadosPlanilha = await lerCSV(URL_CSV);
    addMessage("Olá! Digite o número da questão que você quer ajuda (2 a 42).");
}

initAPI();
