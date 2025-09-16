// ---------------------- Configuração Inicial ----------------------
const API_KEY = ""; // <- cole sua chave aqui

// Link CSV da planilha
const URL_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSdy74VMFCuowXzxgtAcYPDLmU6cj4crafrcd5DrvbltDRYN-_2JbaJZonYOK710n8sVUOhwS5bf9Tl/pub?output=csv";
let dadosPlanilha = [];

async function lerCSV(url) {
  const resp = await fetch(url);
  const text = await resp.text();
  const linhas = text.trim().split("\n").map(l => l.split(","));
  return linhas;
}

// ---------------------- Prompts das Etapas ----------------------

const entendimentoInfo = `
    Você é um assistente educacional de programação que segue a metodologia de Polya.
    Fluxo para cada questão:
    1. Perguntar ENTRADAS e validar.
    2. Perguntar SAÍDAS e validar.
    3. Perguntar RESTRIÇÕES e validar.
    4. Conduzir o aluno a propor um PLANO DE DESENVOLVIMENTO.
    Responda sempre de forma breve, clara e incentivadora:
    - Se estiver incompleto: use "🤔 Vamos pensar mais um pouco..." (máx. 2 frases)
    - Se a resposta estiver completa: comece com "✅ Legal!" e confirme de forma breve.
    Não repita instruções já dadas.
    Utilize emojis sempre que conveniente.
`;

const planejamentoInfo = `
    Agora você está na etapa de PLANEJAMENTO, seguindo a metodologia de Polya.
    O aluno deve criar um pseudocódigo ou fluxograma para organizar o raciocínio.
    Sua função:
    1. Incentivar o aluno a escrever um passo a passo simples (pseudocódigo ou fluxograma textual).
    2. Se o aluno ainda não entender, sugira exemplos bem básicos para guiá-lo.
    3. Se o aluno demonstrar clareza (pseudocódigo consistente), confirme com "✅ Legal!" e direcione para a codificação.
`;

const codificacaoInfo = `
    Agora você está na etapa de CODIFICAÇÃO, seguindo a metodologia de Polya.
    Fluxo:
    1. Incentivar o aluno a propor um esqueleto inicial de código (mesmo que incompleto).
    2. Conduzir o aluno em pequenas etapas:
       - Declaração das variáveis de entrada.
       - Processamento ou cálculos.
       - Exibição dos resultados.
    3. Sempre dar feedback curto, motivador e claro.
    4. Sugerir UMA melhoria ou próximo passo por vez.
    Use exemplos simples e trechos de código quando for útil.
`;

const testes_depuracaoInfo = `
    Você está na etapa de TESTES E DEPURAÇÃO. O código completo do aluno está abaixo.
    Sua missão é guiar o aluno em um ciclo interativo de testes até que o código funcione corretamente.

    **Seu Fluxo de Conversa:**
    1.  **Primeira Interação:** Na primeira vez que entrar nesta etapa, sua primeira mensagem DEVE ser para pedir ao aluno que **execute o código** com um caso de teste e **cole a saída observada**. Exemplo: "Ótimo! Agora, execute seu código com um caso de teste (por exemplo, com as entradas X e Y) e cole a **saída que você observou** aqui."

    2.  **Análise da Saída do Aluno:** Quando o aluno fornecer a saída do programa, sua tarefa é:
        *   **Analisar a Saída:** Compare a saída fornecida pelo aluno com a saída esperada para o problema.
        *   **Se a Saída estiver CORRETA:** Elogie o aluno ("✅ Excelente! O resultado está correto."). Em seguida, sugira um **novo caso de teste**, focando em casos especiais ou limites (ex: entradas com zero, números negativos, texto vazio, etc.) para garantir que o código é robusto. Peça a ele para rodar este novo teste e mostrar a saída.
        *   **Se a Saída estiver INCORRETA ou for um ERRO:** Aponte a discrepância de forma clara, mas sem dar a resposta. ("🤔 Hmm, o resultado não foi o esperado... Para a entrada X, o esperado seria Y, mas seu código produziu Z."). Em seguida, forneça **UMA ÚNICA dica pontual e incremental** para ajudar o aluno a encontrar o bug. Sugira olhar para uma variável, uma linha específica ou a lógica de uma condição. NÃO entregue o código corrigido.
    
    3.  **Finalização:**
        *   Se o aluno disser que terminou, que o código está funcionando, ou usar palavras como "finalizar" ou "concluir", parabenize-o e instrua-o a digitar **'finalizar'** para escolher um novo desafio. Ex: "Parece que está tudo certo! Se você estiver satisfeito, digite 'finalizar' para voltar ao menu de questões."
`;

// ---------------------- Prompt Sistema Polya Consolidado ----------------------
const POLYA_CONTEXT = `
  Você é um assistente educacional de programação que segue a metodologia de Polya, composta por quatro etapas fundamentais:
  1. ENTENDIMENTO DO PROBLEMA: Compreender o problema, identificar entradas, saídas e restrições.
  2. PLANEJAMENTO: Desenvolver um plano para resolver o problema, como pseudocódigo ou fluxograma.
  3. CODIFICAÇÃO: Traduzir o plano em código, passo a passo, começando com um esqueleto inicial.
  4. TESTES E DEPURAÇÃO: Testar o código com casos simples, identificar e corrigir erros.

  Seu papel é guiar o aluno através dessas etapas, fornecendo feedback claro, motivador e específico. Use emojis para tornar a interação mais amigável.

  Inclui Instruções Específicas para Cada Etapa:
  ${entendimentoInfo}
  ${planejamentoInfo}
  ${codificacaoInfo}
  ${testes_depuracaoInfo}

Normas Gerais:
  - Especifique os tipos de erros ou melhorias sugeridas, e jamais entregue a resposta corrigida diretamente.
  - Não exponha chain-of-thoughts ou raciocínios internos.
  - Use exemplos simples e trechos de código quando for útil.
  - Devolva instruções em passos de checklist para facilitar o acompanhamento.
  - NÃO proponha etapas adicionais (por exemplo: "Refatoração" ou "Documentação") a menos que o aluno solicite explicitamente.
  - Na etapa de TESTES E DEPURAÇÃO: sempre solicite que o aluno execute o código localmente e cole a saída observada (para pelo menos um caso) antes de concluir que os testes são válidos.
`;

// ---------------------- Interface UI ----------------------
const chatWindow = document.getElementById('chatWindow');
const chatBtn = document.getElementById('chatBtn');
const closeBtn = document.getElementById('closeBtn');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const chatMessages = document.getElementById('chatMessages');

let model = null;
let currentStep = null;
let questaoAtual = "";

// ---------------------- Contexto da Sessão ----------------------
let sessionContext = {};

function resetSessionContext() {
    sessionContext = {
        question: "",
        understanding: { inputs: "", outputs: "", constraints: "" },
        planning: { plan: "" },
        coding: { snippets: [] },
        testing: { history: [] }
    };
    saveSessionContext();
}

function sessionStorageKey() {
  const keyId = questaoAtual || sessionContext.question || 'global';
  return `polya_session_${keyId}`;
}

function loadSessionContext() {
  try {
    const raw = sessionStorage.getItem(sessionStorageKey());
    if (raw) {
      const parsed = JSON.parse(raw);
      sessionContext = Object.assign({
        question: "",
        understanding: { inputs: "", outputs: "", constraints: "" },
        planning: { plan: "" },
        coding: { snippets: [] },
        testing: { history: [] }
      }, parsed);
    } else {
      resetSessionContext();
    }
  } catch (e) {
    console.error("Erro ao carregar contexto da sessão:", e);
    resetSessionContext();
  }
}

function saveSessionContext() {
  try {
    sessionStorage.setItem(sessionStorageKey(), JSON.stringify(sessionContext));
  } catch (e) {
    console.warn("Erro ao salvar contexto:", e);
  }
}

function buildApiContext(currentStep, userMessage) {
  let context = `
    **Questão Atual:** ${sessionContext.question}

    **Resumo do Progresso do Aluno:**
    - **Entradas Definidas:** ${sessionContext.understanding.inputs || "Ainda não definido."}
    - **Saídas Definidas:** ${sessionContext.understanding.outputs || "Ainda não definido."}
    - **Restrições Definidas:** ${sessionContext.understanding.constraints || "Ainda não definido."}
    - **Plano de Desenvolvimento:** ${sessionContext.planning.plan || "Ainda não definido."}
    - **Trechos de Código Fornecidos:** ${sessionContext.coding.snippets.length > 0 ? sessionContext.coding.snippets.map(s => `\`\`\`\n${s}\n\`\`\``).join('\n') : "Nenhum."}
    - **Histórico de Testes:** ${sessionContext.testing.history.slice(-5).join('|') || "Nenhum."}

    **Tarefa Atual (Etapa de Polya: ${currentStep}):**
    O aluno está tentando resolver esta etapa. A mensagem dele é:
    "${userMessage}"

    **Sua Missão (Instruções para a IA):**
    Com base no resumo completo acima, analise a resposta do aluno para a **Tarefa Atual**.
    - Siga estritamente as regras da etapa de Polya correspondente, conforme definido no seu prompt de sistema.
    - Se a resposta para a tarefa atual estiver correta, comece com "✅ Legal!".
    - Se estiver incompleta ou incorreta, comece com "🤔 Vamos pensar mais um pouco..." e dê uma dica construtiva sem entregar a resposta.
    - Mantenha o foco estritamente na **Tarefa Atual do Aluno**. Não se desvie.
  `;
  return context;
}

function updateSessionContext(step, userMessage, aiResponse) {
  try {
    if (!step) return;
    if (step === "entendimento_input") {
      sessionContext.understanding.inputs = userMessage || sessionContext.understanding.inputs;
    } else if (step === "entendimento_output") {
      sessionContext.understanding.outputs = userMessage || sessionContext.understanding.outputs;
    } else if (step === "entendimento_condicoes") {
      sessionContext.understanding.constraints = userMessage || sessionContext.understanding.constraints;
    } else if (step === "planejamento") {
      sessionContext.planning.plan = userMessage || sessionContext.planning.plan;
    } else if (step && step.startsWith("codificacao_")) {
      if (userMessage && userMessage.trim()) sessionContext.coding.snippets.push(userMessage);
    } else if (step === "testes_depuracao") {
      sessionContext.testing.history.push(`Aluno: ${userMessage}|IA: ${aiResponse || ""}`);
      if (sessionContext.testing.history.length > 20) {
        sessionContext.testing.history.shift();
      }
    }
    saveSessionContext();
  } catch (e) {
    console.warn("Erro ao atualizar contexto:", e);
  }
}

loadSessionContext();

// ---------------------- Funções de UI ----------------------
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
  typingDiv.innerHTML = `<div class="typing-dots"><span></span><span></span><span></span></div>`;
  chatMessages.appendChild(typingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function hideTyping() {
  const typing = document.getElementById('typing');
  if (typing) typing.remove();
}

// ---------------------- API ----------------------
async function sendToAPI(message, extraContext = "") {
  showTyping();
  try {
    let text = "Resposta simulada.";
    if (model) {
      const sessionBlock = buildApiContext(currentStep, message);
      const prompt = `${POLYA_CONTEXT}\n\n${sessionBlock}\n\nContexto adicional: ${extraContext}\n\nQuestão: ${questaoAtual || sessionContext.question || '---'}\n\nAluno: ${message}`;
      const result = await model.generateContent(prompt);
      if (result && result.response) {
        text = await result.response.text();
      } else {
        text = JSON.stringify(result);
      }
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

// ---------------------- Fluxo Principal ----------------------
async function sendMessage() {
  const message = messageInput.value.trim();
  if (!message) return;

  addMessage(message, true);
  messageInput.value = '';

  // ---------------------- Seleção da Questão ----------------------
  if (!sessionContext.question) {
    const numero = parseInt(message);
    if (!isNaN(numero) && numero >= 2 && numero <= 42) {
      resetSessionContext();
      sessionContext.question = `Questão ${numero}: ${dadosPlanilha[numero - 1][0]}`;
      saveSessionContext();
      questaoAtual = dadosPlanilha[numero - 1][0];
      addMessage(`📚 ${sessionContext.question}`);
      addMessage("Vamos começar pela etapa de ENTENDIMENTO.\n\n❓ Quais são as ENTRADAS (dados de entrada) que o programa receberá?");
      currentStep = "entendimento_input";
    } else {
      addMessage("Digite um número de questão válido (2 a 42).", false, true);
    }
    return;
  }

  // ---------------------- ETAPA 1: ENTENDIMENTO ----------------------
  
  // Entradas
  if (currentStep === "entendimento_input") {
    const feedback = await sendToAPI(message, "O estudante respondeu sobre as ENTRADAS. Avalie e responda.");
    updateSessionContext("entendimento_input", message, feedback);
    
    if (feedback && feedback.includes("✅")) {
      currentStep = "entendimento_output";
      addMessage("📤 Agora, quais serão as SAÍDAS (resultados) do programa?");
    }
    return;
  }

  // Saídas
  if (currentStep === "entendimento_output") {
    const feedback = await sendToAPI(message, "O aluno respondeu sobre as SAÍDAS. Avalie e responda.");
    updateSessionContext("entendimento_output", message, feedback);
    
    if (feedback && feedback.includes("✅")) {
      currentStep = "entendimento_condicoes";
      addMessage("⚠️ Existem RESTRIÇÕES ou CONDIÇÕES especiais a considerar?");
    }
    return;
  }

  // Restrições
  if (currentStep === "entendimento_condicoes") {
    const feedback = await sendToAPI(message, "O aluno respondeu sobre as RESTRIÇÕES. Avalie e responda.");
    updateSessionContext("entendimento_condicoes", message, feedback);
    
    if (feedback && feedback.includes("✅")) {
      currentStep = "planejamento";
      addMessage("🎯 Muito bem! Etapa de ENTENDIMENTO concluída!\n\n📝 ETAPA 2: PLANEJAMENTO\nComo você resolveria este problema passo a passo? Crie um pseudocódigo ou fluxograma.");
    }
    return;
  }

  // ---------------------- ETAPA 2: PLANEJAMENTO ----------------------
  if (currentStep === "planejamento") {
    const feedback = await sendToAPI(message, planejamentoInfo);
    updateSessionContext("planejamento", message, feedback);

    if (feedback && feedback.includes("✅")) {
      currentStep = "codificacao_variaveis";
      addMessage("💻 Ótimo plano! Etapa de PLANEJAMENTO concluída!\n\n🔧 ETAPA 3: CODIFICAÇÃO\nComo você declararia as variáveis de entrada?");
    }
    return;
  }

  // ---------------------- ETAPA 3: CODIFICAÇÃO ----------------------
  
  // Variáveis
  if (currentStep === "codificacao_variaveis") {
    const feedback = await sendToAPI(message, codificacaoInfo + "\nO aluno declarou as variáveis. Se estiver correto, pergunte sobre o processamento.");
    updateSessionContext("codificacao_variaveis", message, feedback);
    
    if (feedback && feedback.includes("✅")) {
      currentStep = "codificacao_processamento";
      addMessage("⚙️ Como ficaria o PROCESSAMENTO (cálculos/lógica) do programa?");
    }
    return;
  }

  // Processamento
  if (currentStep === "codificacao_processamento") {
    const feedback = await sendToAPI(message, codificacaoInfo + "\nO aluno escreveu o processamento. Se estiver correto, pergunte sobre a saída.");
    updateSessionContext("codificacao_processamento", message, feedback);
    
    if (feedback && feedback.includes("✅")) {
      currentStep = "codificacao_saida";
      addMessage("📋 Como você exibiria a SAÍDA/resultado?");
    }
    return;
  }

  // Saída
  if (currentStep === "codificacao_saida") {
    const feedback = await sendToAPI(message, codificacaoInfo + "\nO aluno sugeriu a saída. Se estiver correto, elogie e avance para testes.");
    updateSessionContext("codificacao_saida", message, feedback);
    
    if (feedback && feedback.includes("✅")) {
      currentStep = "testes_depuracao";
      sessionContext.testing = sessionContext.testing || { history: [] };
      sessionContext.testing.awaitingTests = true;
      saveSessionContext();
      addMessage("🧪 Código completo! Etapa de CODIFICAÇÃO concluída!\n\n🔍 ETAPA 4: TESTES E DEPURAÇÃO\nForneça casos de teste (formato: entrada => saída esperada).");
    }
    return;
  }

    // ---------------------- ETAPA 4: TESTES E DEPURAÇÃO ----------------------
  if (currentStep === "testes_depuracao") {
    const cmd = message.toLowerCase().trim();

    // Comando explícito para finalizar a etapa e escolher um novo problema
    if (['finalizar', 'concluir', 'menu', 'novo', 'sair'].includes(cmd)) {
        addMessage('🎉 Parabéns! Você completou o desafio com sucesso!');
        
        // Prepara para a próxima questão
        resetSessionContext(); 
        currentStep = null;      
        questaoAtual = "";
        
        addMessage("🎓 Você pode escolher uma nova questão. Digite o número de 2 a 42.");
        return;
    }

    // O contexto para a IA agora é simples. O prompt principal fará o trabalho pesado.
    const extraContext = `O aluno está na etapa de testes. A mensagem/saída dele é: "${message}"`;
    
    const feedback = await sendToAPI(message, extraContext);
    updateSessionContext('testes_depuracao', message, feedback);
    
    return;
  }


  // ---------------------- Fallback ----------------------
  await sendToAPI(message);
}

// ---------------------- Event Listeners ----------------------
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
    addMessage("⚠️ Modo simulado - configure uma API key válida", false, true);
  } else {
    try {
      const { GoogleGenerativeAI } = await import("https://esm.run/@google/generative-ai");
      const genAI = new GoogleGenerativeAI(API_KEY);
      model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash", 
        systemInstruction: POLYA_CONTEXT 
      });
      console.log("✅ API carregada com sucesso.");
    } catch (error) {
      console.error("❌ Erro ao carregar a API:", error);
      addMessage("❌ Erro ao conectar com a API", false, true);
    }
  }

  try {
    dadosPlanilha = await lerCSV(URL_CSV);
    addMessage("🎓 Bem-vindo! Digite o número da questão que você quer ajuda (2 a 42).");
  } catch (error) {
    console.error("❌ Erro ao carregar questões:", error);
    addMessage("❌ Não consegui carregar o banco de questões.", false, true);
  }
}

// ---------------------- Iniciar Aplicação ----------------------
initAPI();
