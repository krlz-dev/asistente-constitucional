/**
 * Asistente Constitucional Bolivia
 * JavaScript Application
 *
 * Integración con Groq API via Vercel Serverless
 */

// Configuration
const CONFIG = {
    API_URL: '/api/chat'
};

// Application State
let state = {
    chatHistory: [],
    isLoading: false
};

// DOM Elements
const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const promptBtns = document.querySelectorAll('.prompt-btn');

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    // Event Listeners
    chatForm.addEventListener('submit', handleSubmit);

    // Quick prompt buttons
    promptBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const prompt = btn.dataset.prompt;
            userInput.value = prompt;
            userInput.focus();
        });
    });

    // Smooth scroll for navigation
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

// Handle form submission
async function handleSubmit(e) {
    e.preventDefault();

    const message = userInput.value.trim();
    if (!message || state.isLoading) return;

    // Add user message to chat
    addMessage(message, 'user');
    userInput.value = '';

    // Show loading indicator
    setLoading(true);
    const loadingMessage = addLoadingMessage();

    try {
        // Get AI response
        const response = await getAIResponse(message);

        // Remove loading and add response
        loadingMessage.remove();
        addMessage(response, 'assistant');

    } catch (error) {
        loadingMessage.remove();
        handleError(error);
    } finally {
        setLoading(false);
    }
}

// Add message to chat
function addMessage(content, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;

    const icon = type === 'user' ? 'bi-person' : 'bi-robot';

    messageDiv.innerHTML = `
        <div class="message-avatar">
            <i class="bi ${icon}"></i>
        </div>
        <div class="message-content">
            ${formatMessage(content)}
        </div>
    `;

    chatMessages.appendChild(messageDiv);
    scrollToBottom();

    // Store in history
    state.chatHistory.push({ role: type, content: content });

    return messageDiv;
}

// Format message content (handle markdown-like formatting)
function formatMessage(content) {
    // Convert basic markdown to HTML
    let formatted = content
        // Bold
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Italic
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Line breaks
        .replace(/\n/g, '<br>')
        // Lists
        .replace(/^- (.*)/gm, '<li>$1</li>')
        // Article references
        .replace(/Art(?:ículo)?\.?\s*(\d+)/gi, '<strong>Artículo $1</strong>');

    // Wrap list items in ul if present
    if (formatted.includes('<li>')) {
        formatted = formatted.replace(/(<li>.*<\/li>)+/g, '<ul>$&</ul>');
    }

    return `<p>${formatted}</p>`;
}

// Add loading indicator
function addLoadingMessage() {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message assistant-message';
    loadingDiv.innerHTML = `
        <div class="message-avatar">
            <i class="bi bi-robot"></i>
        </div>
        <div class="message-content">
            <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;
    chatMessages.appendChild(loadingDiv);
    scrollToBottom();
    return loadingDiv;
}

// Get AI Response from serverless API
async function getAIResponse(userMessage) {
    const response = await fetch(CONFIG.API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            message: userMessage
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error HTTP: ${response.status}`);
    }

    const data = await response.json();
    return data.reply || 'Lo siento, no pude generar una respuesta.';
}

// Handle errors
function handleError(error) {
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

// Loading state
function setLoading(isLoading) {
    state.isLoading = isLoading;
    sendBtn.disabled = isLoading;
    userInput.disabled = isLoading;

    if (isLoading) {
        sendBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
    } else {
        sendBtn.innerHTML = '<i class="bi bi-send"></i>';
    }
}

// Scroll chat to bottom
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}
