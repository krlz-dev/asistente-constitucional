/**
 * Asistente Constitucional Bolivia
 * JavaScript Application
 *
 * Integración con Groq API via Vercel Serverless
 */

// Configuration
const CONFIG = {
    API_URL: '/api/chat',
    ARTICLES_API: '/api/articles'
};

// Application State
let state = {
    chatHistory: [],
    isLoading: false,
    articles: [],
    filteredArticles: [],
    articlesDisplayed: 0,
    articlesPerPage: 20,
    currentArticle: null
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

    // Initialize articles section
    initArticles();
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

// ==========================================
// ARTICLES SECTION
// ==========================================

async function initArticles() {
    const articlesGrid = document.getElementById('articlesGrid');
    const articleSearch = document.getElementById('articleSearch');
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    const loadMoreContainer = document.getElementById('loadMoreContainer');

    if (!articlesGrid) return;

    // Load articles
    try {
        const response = await fetch(CONFIG.ARTICLES_API);
        if (!response.ok) throw new Error('Failed to load articles');

        const data = await response.json();
        state.articles = data.articulos || [];
        state.filteredArticles = [...state.articles];

        // Update stats
        document.getElementById('totalArticles').textContent = state.articles.length;
        const withAnalysis = state.articles.filter(a => a.tieneAnalisis).length;
        document.getElementById('articlesWithAnalysis').textContent = withAnalysis;

        // Display articles
        displayArticles();

    } catch (error) {
        console.error('Error loading articles:', error);
        articlesGrid.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="bi bi-exclamation-triangle text-warning" style="font-size: 3rem;"></i>
                <p class="text-muted mt-2">No se pudieron cargar los artículos</p>
            </div>
        `;
    }

    // Search functionality
    if (articleSearch) {
        articleSearch.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            filterArticles(query);
        });
    }

    // Load more button
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            displayArticles(true);
        });
    }

    // Ask about article button
    const askAboutBtn = document.getElementById('askAboutArticle');
    if (askAboutBtn) {
        askAboutBtn.addEventListener('click', () => {
            if (state.currentArticle) {
                const articleModal = bootstrap.Modal.getInstance(document.getElementById('articleModal'));
                articleModal.hide();

                userInput.value = `Explícame el Artículo ${state.currentArticle.id} de la Constitución`;
                document.getElementById('chat').scrollIntoView({ behavior: 'smooth' });
                userInput.focus();
            }
        });
    }
}

function filterArticles(query) {
    if (!query) {
        state.filteredArticles = [...state.articles];
    } else {
        state.filteredArticles = state.articles.filter(art => {
            const idMatch = art.id.toString().includes(query);
            const titleMatch = (art.titulo || '').toLowerCase().includes(query);
            const descMatch = (art.presentacion || '').toLowerCase().includes(query);
            return idMatch || titleMatch || descMatch;
        });
    }

    state.articlesDisplayed = 0;
    displayArticles();
}

function displayArticles(append = false) {
    const articlesGrid = document.getElementById('articlesGrid');
    const loadMoreContainer = document.getElementById('loadMoreContainer');

    if (!append) {
        articlesGrid.innerHTML = '';
        state.articlesDisplayed = 0;
    }

    const start = state.articlesDisplayed;
    const end = start + state.articlesPerPage;
    const toDisplay = state.filteredArticles.slice(start, end);

    if (toDisplay.length === 0 && !append) {
        articlesGrid.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="bi bi-search text-muted" style="font-size: 3rem;"></i>
                <p class="text-muted mt-2">No se encontraron artículos</p>
            </div>
        `;
        loadMoreContainer.style.display = 'none';
        return;
    }

    toDisplay.forEach(article => {
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-4';
        col.innerHTML = `
            <div class="card article-card h-100 shadow-sm" data-article-id="${article.id}">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <span class="badge bg-primary">Art. ${article.id}</span>
                        ${article.tieneAnalisis ? '<span class="badge bg-success"><i class="bi bi-check-circle"></i></span>' : ''}
                    </div>
                    <h6 class="card-title">${article.titulo || 'Artículo ' + article.id}</h6>
                    <p class="card-text small text-muted">${article.presentacion ? article.presentacion.substring(0, 150) + '...' : 'Sin descripción disponible'}</p>
                </div>
                <div class="card-footer bg-transparent border-0">
                    <button class="btn btn-sm btn-outline-primary w-100 view-article-btn">
                        <i class="bi bi-eye me-1"></i>Ver detalle
                    </button>
                </div>
            </div>
        `;

        // Add click handler
        col.querySelector('.view-article-btn').addEventListener('click', () => {
            showArticleDetail(article.id);
        });

        articlesGrid.appendChild(col);
    });

    state.articlesDisplayed = end;

    // Show/hide load more button
    if (end < state.filteredArticles.length) {
        loadMoreContainer.style.display = 'block';
    } else {
        loadMoreContainer.style.display = 'none';
    }
}

async function showArticleDetail(articleId) {
    const modalTitle = document.getElementById('articleModalTitle');
    const modalBody = document.getElementById('articleModalBody');
    const modal = new bootstrap.Modal(document.getElementById('articleModal'));

    modalTitle.textContent = `Artículo ${articleId}`;
    modalBody.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status"></div>
            <p class="text-muted mt-2">Cargando artículo...</p>
        </div>
    `;

    modal.show();

    try {
        const response = await fetch(`${CONFIG.ARTICLES_API}?id=${articleId}`);
        if (!response.ok) throw new Error('Article not found');

        const article = await response.json();
        state.currentArticle = article;

        modalTitle.textContent = article.titulo || `Artículo ${articleId}`;

        let content = '';

        if (article.articuloTranscrito) {
            content += `
                <div class="mb-4">
                    <h6 class="text-primary"><i class="bi bi-file-text me-2"></i>Texto del Artículo</h6>
                    <div class="p-3 bg-light rounded">${article.articuloTranscrito}</div>
                </div>
            `;
        }

        if (article.presentacion) {
            content += `
                <div class="mb-4">
                    <h6 class="text-primary"><i class="bi bi-info-circle me-2"></i>Presentación</h6>
                    <p>${article.presentacion}</p>
                </div>
            `;
        }

        if (article.descripcion) {
            content += `
                <div class="mb-4">
                    <h6 class="text-primary"><i class="bi bi-card-text me-2"></i>Descripción</h6>
                    <p>${article.descripcion}</p>
                </div>
            `;
        }

        if (article.analisis && article.analisis.length > 0) {
            content += `
                <div class="mb-4">
                    <h6 class="text-primary"><i class="bi bi-lightbulb me-2"></i>Análisis</h6>
                    <div class="accordion" id="analysisAccordion">
            `;

            article.analisis.forEach((analisis, idx) => {
                content += `
                    <div class="accordion-item">
                        <h2 class="accordion-header">
                            <button class="accordion-button ${idx > 0 ? 'collapsed' : ''}" type="button"
                                    data-bs-toggle="collapse" data-bs-target="#analysis${idx}">
                                <span class="badge bg-secondary me-2">${analisis.tipo}</span>
                                ${analisis.titulo}
                            </button>
                        </h2>
                        <div id="analysis${idx}" class="accordion-collapse collapse ${idx === 0 ? 'show' : ''}"
                             data-bs-parent="#analysisAccordion">
                            <div class="accordion-body">
                                ${analisis.contenido || 'Sin contenido disponible'}
                                ${analisis.concordancias ? `<hr><small class="text-muted"><strong>Concordancias:</strong> ${analisis.concordancias}</small>` : ''}
                            </div>
                        </div>
                    </div>
                `;
            });

            content += `</div></div>`;
        }

        if (!content) {
            content = '<p class="text-muted">No hay información detallada disponible para este artículo.</p>';
        }

        modalBody.innerHTML = content;

    } catch (error) {
        console.error('Error loading article:', error);
        modalBody.innerHTML = `
            <div class="text-center py-5">
                <i class="bi bi-exclamation-triangle text-warning" style="font-size: 3rem;"></i>
                <p class="text-muted mt-2">No se pudo cargar el artículo</p>
            </div>
        `;
    }
}
