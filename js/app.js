/**
 * Asistente Constitucional Bolivia
 * JavaScript Application
 *
 * Integración con Hugging Face Inference API
 * Modelo recomendado: mistralai/Mistral-7B-Instruct-v0.2
 */

// Configuration
const CONFIG = {
    // Hugging Face model - Mistral is great for Spanish legal text
    MODEL_ID: 'mistralai/Mistral-7B-Instruct-v0.2',

    // Alternative models for different use cases:
    // 'meta-llama/Llama-2-7b-chat-hf' - Good for conversations
    // 'google/flan-t5-xxl' - Good for Q&A
    // 'bigscience/bloom' - Multilingual support

    API_URL: 'https://api-inference.huggingface.co/models/',
    MAX_TOKENS: 1024,
    TEMPERATURE: 0.7
};

// System prompt for constitutional law context
const SYSTEM_PROMPT = `Eres un asistente legal especializado en la Constitución Política del Estado Plurinacional de Bolivia (CPE 2009).

Tu rol es:
1. Responder preguntas sobre derecho constitucional boliviano de manera clara y precisa
2. Citar artículos específicos de la CPE cuando sea relevante
3. Explicar conceptos constitucionales de forma accesible
4. Distinguir entre derechos fundamentales, garantías constitucionales y procedimientos
5. Aclarar cuando una pregunta está fuera del ámbito constitucional

Contexto de la CPE Bolivia 2009:
- Es la constitución vigente desde el 7 de febrero de 2009
- Tiene 411 artículos organizados en 5 Partes
- Establece el Estado Plurinacional reconociendo 36 nacionalidades
- Primera Parte: Bases Fundamentales del Estado (Art. 1-12)
- Segunda Parte: Derechos, Deberes y Garantías (Art. 13-144)
- Tercera Parte: Estructura del Estado (Art. 145-268)
- Cuarta Parte: Estructura Económica del Estado (Art. 269-341)
- Quinta Parte: Primacía y Reforma de la Constitución (Art. 342-411)

Principios clave:
- Plurinacionalidad e interculturalidad
- Descentralización y autonomías
- Economía plural (estatal, privada, comunitaria, cooperativa)
- Derechos colectivos de naciones y pueblos indígenas originarios
- Control social y participación ciudadana

Siempre responde en español, de manera profesional pero accesible.`;

// Application State
let state = {
    apiKey: localStorage.getItem('hf_api_key') || '',
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
    // Check for API key
    if (!state.apiKey) {
        showApiKeyModal();
    }

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

    // API Key save button
    document.getElementById('saveApiKey')?.addEventListener('click', saveApiKey);

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

    // Check API key
    if (!state.apiKey) {
        showApiKeyModal();
        return;
    }

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

// Get AI Response from Hugging Face
async function getAIResponse(userMessage) {
    // Build conversation context
    const conversationContext = state.chatHistory
        .slice(-6) // Keep last 3 exchanges for context
        .map(msg => `${msg.role === 'user' ? 'Usuario' : 'Asistente'}: ${msg.content}`)
        .join('\n');

    // Create prompt with system context
    const fullPrompt = `<s>[INST] ${SYSTEM_PROMPT}

Conversación previa:
${conversationContext}

Usuario: ${userMessage}

Responde de manera clara, profesional y citando artículos de la CPE cuando sea relevante. [/INST]`;

    const response = await fetch(`${CONFIG.API_URL}${CONFIG.MODEL_ID}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${state.apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            inputs: fullPrompt,
            parameters: {
                max_new_tokens: CONFIG.MAX_TOKENS,
                temperature: CONFIG.TEMPERATURE,
                top_p: 0.9,
                do_sample: true,
                return_full_text: false
            }
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error HTTP: ${response.status}`);
    }

    const data = await response.json();

    // Extract generated text
    let generatedText = '';
    if (Array.isArray(data) && data[0]?.generated_text) {
        generatedText = data[0].generated_text;
    } else if (data.generated_text) {
        generatedText = data.generated_text;
    } else {
        throw new Error('Formato de respuesta inesperado');
    }

    // Clean up response
    generatedText = generatedText
        .replace(/^\s*Asistente:\s*/i, '')
        .trim();

    return generatedText || 'Lo siento, no pude generar una respuesta. Por favor, intenta reformular tu pregunta.';
}

// Alternative: Use a free inference endpoint or local model
async function getAIResponseFallback(userMessage) {
    // This is a fallback that creates a simulated response
    // In production, you would connect to your own backend

    const responses = {
        'derechos fundamentales': `Los derechos fundamentales en la CPE Bolivia 2009 están establecidos en la Segunda Parte, Título II (Artículos 13 al 107). Se clasifican en:

**Derechos Fundamentalísimos (Art. 15-20):**
- Derecho a la vida e integridad física
- Derecho al agua y alimentación
- Prohibición de tortura y tratos crueles

**Derechos Civiles (Art. 21-25):**
- Libertad de pensamiento y expresión
- Privacidad e intimidad
- Libertad de reunión y asociación

**Derechos Políticos (Art. 26-29):**
- Participación en asuntos públicos
- Sufragio universal
- Control social`,

        'organización del estado': `El Estado Plurinacional de Bolivia se organiza según la Tercera Parte de la CPE (Art. 145-268):

**Órgano Legislativo (Art. 145-164):**
- Asamblea Legislativa Plurinacional
- Cámara de Diputados y Senadores

**Órgano Ejecutivo (Art. 165-177):**
- Presidente y Vicepresidente
- Ministros de Estado

**Órgano Judicial (Art. 178-204):**
- Tribunal Supremo de Justicia
- Jurisdicción ordinaria y agroambiental

**Órgano Electoral (Art. 205-212):**
- Tribunal Supremo Electoral`,

        'pueblos indígenas': `Los derechos de las naciones y pueblos indígenas están reconocidos en múltiples partes de la CPE:

**Artículo 2:** Reconoce la preexistencia de las naciones indígenas y su derecho a la libre determinación.

**Artículo 30:** Establece 18 derechos específicos, incluyendo:
- Identidad cultural
- Titulación colectiva de tierras
- Consulta previa obligatoria
- Participación en beneficios de recursos naturales
- Gestión territorial autónoma

**Artículo 289-296:** Autonomía Indígena Originaria Campesina.`
    };

    // Find matching response
    const lowerMessage = userMessage.toLowerCase();
    for (const [key, response] of Object.entries(responses)) {
        if (lowerMessage.includes(key)) {
            return response;
        }
    }

    return `Gracias por tu pregunta sobre: "${userMessage}"

Para responder de manera precisa, te recomiendo revisar los siguientes recursos de la CPE Bolivia 2009:

1. **Primera Parte (Art. 1-12):** Bases fundamentales del Estado
2. **Segunda Parte (Art. 13-144):** Derechos y garantías
3. **Tercera Parte (Art. 145-268):** Estructura del Estado

¿Podrías especificar más tu consulta para darte una respuesta más detallada?`;
}

// Handle errors
function handleError(error) {
    console.error('Error:', error);

    let errorMessage = 'Lo siento, ocurrió un error. ';

    if (error.message.includes('401')) {
        errorMessage += 'La API key no es válida. Por favor, verifica tu configuración.';
        showApiKeyModal();
    } else if (error.message.includes('429')) {
        errorMessage += 'Se ha excedido el límite de solicitudes. Por favor, espera un momento.';
    } else if (error.message.includes('503')) {
        errorMessage += 'El modelo está cargando. Por favor, intenta en unos segundos.';
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

// Show API Key Modal
function showApiKeyModal() {
    const modal = new bootstrap.Modal(document.getElementById('apiKeyModal'));
    modal.show();
}

// Save API Key
function saveApiKey() {
    const apiKeyInput = document.getElementById('hfApiKey');
    const key = apiKeyInput.value.trim();

    if (key && key.startsWith('hf_')) {
        state.apiKey = key;
        localStorage.setItem('hf_api_key', key);

        const modal = bootstrap.Modal.getInstance(document.getElementById('apiKeyModal'));
        modal.hide();

        // Show success message
        addMessage('¡API Key configurada correctamente! Ya puedes realizar consultas.', 'assistant');
    } else {
        alert('Por favor, ingresa una API key válida de Hugging Face (comienza con "hf_")');
    }
}

// Export functions for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        formatMessage,
        getAIResponse,
        CONFIG
    };
}
