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
1. Perguntar ENTRADAS e validar (aceitar hipóteses se incompleto).
2. Perguntar SAÍDAS e validar (aceitar hipóteses se incompleto).
3. Perguntar RESTRIÇÕES e validar (aceitar hipóteses se incompleto).
4. Conduzir o aluno a propor um PLANO DE DESENVOLVIMENTO.
Responda sempre de forma breve e clara.
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

// variáveis para armazenar respostas
let entradas = "";
let hipoteseEntradas = "";
let saidas = "";
let hipoteseSaidas = "";
let restricoes = "";
let hipoteseRestricoes = "";

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
        let text = "Resposta simulada.";
        if (model) {
            const result = await model.generateContent(`${context}\nQuestão: ${questaoAtual}\nAluno: ${message}`);
            const response = await result.response;
            text = response.text();
        }
        hideTyping();
        addMessage(text);
        return text;
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
            questaoAtual = dadosPlanilha[numero - 1].join(" "); // pega enunciado completo
            addMessage(`Questão ${numero}: "${questaoAtual}"`);
            addMessage("Vamos começar pela etapa de ENTENDIMENTO.\nQuais são as ENTRADAS (dados de entrada) que o programa receberá?");
            currentStep = "entendimento_input";
        } else {
            addMessage("Digite um número de questão válido (2 a 42).", false, true);
        }
        return;
    }

    // ---------------- ENTRADAS ----------------
    if (currentStep === "entendimento_input") {
        const feedback = await sendToAPI(message, `
            O aluno respondeu sobre as ENTRADAS.
            Responda em até 2 frases.
            Se estiver completo → confirme positivamente.
            Se estiver incompleto ou ambíguo → peça hipóteses adicionais.
        `);

        if (feedback.toLowerCase().includes("incompleto") || feedback.toLowerCase().includes("ambíguo")) {
            currentStep = "entendimento_input_faltante";
        } else {
            entradas = message;
            currentStep = "entendimento_output";
            addMessage("Agora, quais serão as SAÍDAS (resultados) do programa?");
        }
        return;
    }

    if (currentStep === "entendimento_input_faltante") {
        hipoteseEntradas = message;
        addMessage("Boa hipótese! Agora seguimos.");
        currentStep = "entendimento_output";
        addMessage("Quais serão as SAÍDAS (resultados) do programa?");
        return;
    }

    if (respostaDetectadaComoHipotese) {
        addMessage("Boa hipótese! Vamos em frente. Agora, considerando essa hipótese, quais serão as ENTRADAS (dados) que o programa receberá?");
        etapaAtual = "entradas";  // força voltar para entradas
        return;
    }
    

    // ---------------- SAÍDAS ----------------
    if (currentStep === "entendimento_output") {
        const feedback = await sendToAPI(message, `
            O aluno respondeu sobre as SAÍDAS.
            Responda em até 2 frases.
            Se estiver correto → confirme.
            Se estiver incompleto ou ambíguo → peça hipóteses.
        `);

        if (feedback.toLowerCase().includes("incompleto") || feedback.toLowerCase().includes("ambíguo")) {
            currentStep = "entendimento_output_faltante";
        } else {
            saidas = message;
            currentStep = "entendimento_condicoes";
            addMessage("Existem RESTRIÇÕES ou CONDIÇÕES especiais a considerar?");
        }
        return;
    }

    if (currentStep === "entendimento_output_faltante") {
        hipoteseSaidas = message;
        addMessage("Boa hipótese! Vamos em frente.");
        currentStep = "entendimento_condicoes";
        addMessage("Existem RESTRIÇÕES ou CONDIÇÕES especiais a considerar?");
        return;
    }

    // ---------------- RESTRIÇÕES ----------------
    if (currentStep === "entendimento_condicoes") {
        const feedback = await sendToAPI(message, `
            O aluno respondeu sobre as RESTRIÇÕES.
            Responda em até 2 frases.
            Se estiver ok → confirme.
            Se estiver faltando → peça hipóteses.
        `);

        if (feedback.toLowerCase().includes("incompleto") || feedback.toLowerCase().includes("ambíguo") || feedback.toLowerCase().includes("faltando")) {
            currentStep = "entendimento_condicoes_faltante";
        } else {
            restricoes = message;
            currentStep = "desenvolvimento";
            addMessage("Muito bem! Agora vamos para a etapa de DESENVOLVIMENTO.\nComo você resolveria este problema passo a passo?");
        }
        return;
    }

    if (currentStep === "entendimento_condicoes_faltante") {
        hipoteseRestricoes = message;
        addMessage("Perfeito, suposição válida. Agora seguimos.");
        currentStep = "desenvolvimento";
        addMessage("Vamos para a etapa de DESENVOLVIMENTO. Como você resolveria este problema passo a passo?");
        return;
    }

    // ---------------- DESENVOLVIMENTO ----------------
    if (currentStep === "desenvolvimento") {
        await sendToAPI(message, `
            Analise este plano de resolução e sugira UMA melhoria simples.
        `);
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
