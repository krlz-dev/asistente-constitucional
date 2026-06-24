/**
 * Floating chat widget: talks to the /api/chat endpoint, renders messages,
 * and links article references back to the explorer modal.
 */
const API_URL = '/api/chat';

const WELCOME_HTML = `
  <div class="message assistant-message">
    <div class="message-content">
      <p>¡Hola! Soy tu asistente de la CPE Bolivia. ¿En qué puedo ayudarte?</p>
    </div>
  </div>
`;

const chatState = {
  chatHistory: [] as { role: string; content: string }[],
  isLoading: false,
};

let chatMessages: HTMLElement | null;
let chatForm: HTMLFormElement | null;
let userInput: HTMLTextAreaElement | null;
let sendBtn: HTMLButtonElement | null;

export function initChat(): void {
  chatMessages = document.getElementById('chatMessages');
  chatForm = document.getElementById('chatForm') as HTMLFormElement | null;
  userInput = document.getElementById('userInput') as HTMLTextAreaElement | null;
  sendBtn = document.getElementById('sendBtn') as HTMLButtonElement | null;

  const chatToggleBtn = document.getElementById('chatToggleBtn');
  const chatCloseBtn = document.getElementById('chatCloseBtn');
  const chatNewBtn = document.getElementById('chatNewBtn');

  chatToggleBtn?.addEventListener('click', toggleChat);
  chatCloseBtn?.addEventListener('click', toggleChat);
  chatNewBtn?.addEventListener('click', startNewConversation);
  chatForm?.addEventListener('submit', handleSubmit);

  if (userInput) {
    userInput.addEventListener('input', autoGrowTextarea);
    userInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        chatForm?.dispatchEvent(new Event('submit'));
      }
    });
  }
}

function toggleChat(): void {
  const chatWindow = document.getElementById('chatWindow');
  const chatToggleBtn = document.getElementById('chatToggleBtn');
  const chatBackdrop = document.getElementById('chatBackdrop');
  if (!chatWindow) return;

  chatWindow.classList.toggle('open');
  document.body.classList.toggle('chat-open');
  chatToggleBtn?.classList.toggle('hidden');
  chatBackdrop?.classList.toggle('show');

  if (chatWindow.classList.contains('open')) userInput?.focus();
}

function startNewConversation(): void {
  chatState.chatHistory = [];
  if (chatMessages) chatMessages.innerHTML = WELCOME_HTML;
  if (userInput) {
    userInput.value = '';
    userInput.style.height = 'auto';
    userInput.focus();
  }
  chatState.isLoading = false;
  if (sendBtn) sendBtn.disabled = false;
}

function autoGrowTextarea(this: HTMLTextAreaElement): void {
  this.style.height = 'auto';
  this.style.height = Math.min(this.scrollHeight, 120) + 'px';
}

async function handleSubmit(e: Event): Promise<void> {
  e.preventDefault();
  if (!userInput) return;

  const message = userInput.value.trim();
  if (!message || chatState.isLoading) return;

  addMessage(message, 'user');
  userInput.value = '';
  userInput.style.height = 'auto';

  setLoading(true);
  const loadingMessage = addLoadingMessage();

  try {
    const response = await getAIResponse(message);
    loadingMessage.remove();
    addMessage(response, 'assistant');
  } catch (error) {
    loadingMessage.remove();
    handleError(error as Error);
  } finally {
    setLoading(false);
  }
}

function addMessage(content: string, type: 'user' | 'assistant'): HTMLElement {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${type}-message`;
  const icon = type === 'user' ? 'bi-person' : 'bi-robot';

  messageDiv.innerHTML = `
    <div class="message-avatar"><i class="bi ${icon}"></i></div>
    <div class="message-content">${formatMessage(content)}</div>
  `;

  chatMessages!.appendChild(messageDiv);
  scrollToBottom();

  messageDiv.querySelectorAll<HTMLElement>('.article-link').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const articleId = parseInt(link.dataset.article || '');
      if (articleId && typeof (window as any).showArticleDetail === 'function') {
        (window as any).showArticleDetail(articleId);
      }
    });
  });

  chatState.chatHistory.push({ role: type, content });
  return messageDiv;
}

function formatMessage(content: string): string {
  let formatted = content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>')
    .replace(/^- (.*)/gm, '<li>$1</li>')
    .replace(/Art(?:í|i)culo\s*(\d+)/gi, '<a href="#" class="article-link" data-article="$1">Artículo $1</a>');

  if (formatted.includes('<li>')) {
    formatted = formatted.replace(/(<li>.*<\/li>)+/g, '<ul>$&</ul>');
  }

  return `<p>${formatted}</p>`;
}

function addLoadingMessage(): HTMLElement {
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'message assistant-message';
  loadingDiv.innerHTML = `
    <div class="message-avatar"><i class="bi bi-robot"></i></div>
    <div class="message-content">
      <div class="typing-indicator"><span></span><span></span><span></span></div>
    </div>
  `;
  chatMessages!.appendChild(loadingDiv);
  scrollToBottom();
  return loadingDiv;
}

async function getAIResponse(userMessage: string): Promise<string> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: userMessage }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Error HTTP: ${response.status}`);
  }

  const data = await response.json();
  return data.reply || 'Lo siento, no pude generar una respuesta.';
}

function handleError(error: Error): void {
  console.error('Error:', error);
  let errorMessage = 'Lo siento, ocurrió un error. ';

  if (error.message.includes('429')) {
    errorMessage += 'Se ha excedido el límite de solicitudes. Por favor, espera un momento.';
  } else if (error.message.includes('500')) {
    errorMessage += 'Error del servidor. Por favor, intenta de nuevo.';
  } else {
    errorMessage += error.message || 'Por favor, intenta de nuevo.';
  }

  addMessage(errorMessage, 'assistant');
}

function setLoading(isLoading: boolean): void {
  chatState.isLoading = isLoading;
  if (sendBtn) sendBtn.disabled = isLoading;
  if (userInput) userInput.disabled = isLoading;

  if (sendBtn) {
    sendBtn.innerHTML = isLoading
      ? '<span class="spinner-border spinner-border-sm"></span>'
      : '<i class="bi bi-send"></i>';
  }
}

function scrollToBottom(): void {
  if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
}
