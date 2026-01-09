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
    tematicas: [],
    selectedTematica: null,
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
        state.tematicas = data.tematicas || [];
        state.filteredArticles = [...state.articles];

        // Update stats
        document.getElementById('totalArticles').textContent = state.articles.length;
        const withAnalysis = state.articles.filter(a => a.tieneAnalisis).length;
        document.getElementById('articlesWithAnalysis').textContent = withAnalysis;

        // Display temáticas filter
        displayTematicasFilter();

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
            state.selectedTematica = null;
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

function displayTematicasFilter() {
    const container = document.getElementById('tematicasFilter');
    if (!container || !state.tematicas.length) return;

    let html = '<button class="btn btn-sm btn-primary tematica-btn active" data-tematica="">Todas</button>';

    state.tematicas.slice(0, 20).forEach(t => {
        html += `<button class="btn btn-sm btn-outline-primary tematica-btn" data-tematica="${t.titulo}">${t.titulo} (${t.articulos.length})</button>`;
    });

    if (state.tematicas.length > 20) {
        html += `<button class="btn btn-sm btn-outline-secondary" disabled>+${state.tematicas.length - 20} más</button>`;
    }

    container.innerHTML = html;

    // Add click handlers
    container.querySelectorAll('.tematica-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.tematica-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const tematica = btn.dataset.tematica;
            state.selectedTematica = tematica || null;

            if (tematica) {
                const tema = state.tematicas.find(t => t.titulo === tematica);
                if (tema) {
                    state.filteredArticles = state.articles.filter(a => tema.articulos.includes(a.id));
                }
            } else {
                state.filteredArticles = [...state.articles];
            }

            state.articlesDisplayed = 0;
            displayArticles();
        });
    });
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

        // Constitutional structure breadcrumb
        if (article.estructura) {
            content += buildEstructuraBreadcrumb(article.estructura);
        }

        // Article text
        if (article.articuloTranscrito) {
            content += `
                <div class="mb-4">
                    <h6 class="text-primary"><i class="bi bi-file-text me-2"></i>Texto del Artículo</h6>
                    <div class="p-3 bg-light rounded">${article.articuloTranscrito}</div>
                </div>
            `;
        }

        // Related articles (concordancias)
        if (article.articulosRelacionados && article.articulosRelacionados.length > 0) {
            content += `
                <div class="mb-4">
                    <h6 class="text-primary"><i class="bi bi-diagram-3 me-2"></i>Artículos Relacionados (${article.articulosRelacionados.length})</h6>
                    <div class="related-articles">
                        ${article.articulosRelacionados.slice(0, 20).map(id =>
                            `<button class="btn btn-sm btn-outline-secondary me-1 mb-1 related-article-btn" data-article="${id}">Art. ${id}</button>`
                        ).join('')}
                        ${article.articulosRelacionados.length > 20 ? `<span class="badge bg-secondary">+${article.articulosRelacionados.length - 20} más</span>` : ''}
                    </div>
                </div>
            `;
        }

        // Grouped Analysis
        if (article.analisis) {
            const { tematica, categoria, subcategoria } = article.analisis;
            let accordionIdx = 0;

            content += `<div class="mb-4"><h6 class="text-primary"><i class="bi bi-lightbulb me-2"></i>Análisis</h6><div class="accordion" id="analysisAccordion">`;

            // Temáticas first
            if (tematica && tematica.length > 0) {
                tematica.forEach(item => {
                    content += buildAccordionItem(item, 'Temática', 'bg-primary', accordionIdx++);
                });
            }

            // Then Categorías
            if (categoria && categoria.length > 0) {
                categoria.forEach(item => {
                    content += buildAccordionItem(item, 'Categoría', 'bg-info', accordionIdx++);
                });
            }

            // Then Subcategorías
            if (subcategoria && subcategoria.length > 0) {
                subcategoria.forEach(item => {
                    content += buildAccordionItem(item, 'Subcategoría', 'bg-secondary', accordionIdx++);
                });
            }

            content += `</div></div>`;
        }

        if (!content) {
            content = '<p class="text-muted">No hay información detallada disponible para este artículo.</p>';
        }

        modalBody.innerHTML = content;

        // Add click handlers for related articles
        modalBody.querySelectorAll('.related-article-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const relatedId = parseInt(btn.dataset.article);
                showArticleDetail(relatedId);
            });
        });

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

function buildAccordionItem(item, tipo, badgeClass, idx) {
    const relatedLinks = item.articulosRelacionados && item.articulosRelacionados.length > 0
        ? `<div class="mt-3 pt-3 border-top">
             <small class="text-muted"><strong>Concordancias:</strong></small><br>
             ${item.articulosRelacionados.slice(0, 10).map(id =>
                 `<button class="btn btn-sm btn-outline-secondary me-1 mb-1 related-article-btn" data-article="${id}">Art. ${id}</button>`
             ).join('')}
             ${item.articulosRelacionados.length > 10 ? `<span class="badge bg-secondary">+${item.articulosRelacionados.length - 10} más</span>` : ''}
           </div>`
        : '';

    return `
        <div class="accordion-item">
            <h2 class="accordion-header">
                <button class="accordion-button ${idx > 0 ? 'collapsed' : ''}" type="button"
                        data-bs-toggle="collapse" data-bs-target="#analysis${idx}">
                    <span class="badge ${badgeClass} me-2">${tipo}</span>
                    ${item.titulo || 'Sin título'}
                </button>
            </h2>
            <div id="analysis${idx}" class="accordion-collapse collapse ${idx === 0 ? 'show' : ''}"
                 data-bs-parent="#analysisAccordion">
                <div class="accordion-body">
                    ${item.contenido || 'Sin contenido disponible'}
                    ${relatedLinks}
                </div>
            </div>
        </div>
    `;
}

// Build constitutional structure breadcrumb
function buildEstructuraBreadcrumb(estructura) {
    if (!estructura) return '';

    const parts = [];

    if (estructura.parte) {
        parts.push(`<span class="estructura-item parte"><i class="bi bi-bookmark-fill"></i> Parte ${toRoman(estructura.parte.numero)}: ${estructura.parte.nombre}</span>`);
    }

    if (estructura.titulo) {
        parts.push(`<span class="estructura-item titulo"><i class="bi bi-collection"></i> Título ${toRoman(estructura.titulo.numero)}: ${estructura.titulo.nombre}</span>`);
    }

    if (estructura.capitulo) {
        parts.push(`<span class="estructura-item capitulo"><i class="bi bi-folder2"></i> Capítulo ${estructura.capitulo.numero}: ${estructura.capitulo.nombre}</span>`);
    }

    if (estructura.seccion) {
        parts.push(`<span class="estructura-item seccion"><i class="bi bi-file-text"></i> Sección ${toRoman(estructura.seccion.numero)}: ${estructura.seccion.nombre}</span>`);
    }

    if (parts.length === 0) return '';

    return `
        <div class="estructura-breadcrumb mb-4">
            <h6 class="text-primary mb-2"><i class="bi bi-diagram-2 me-2"></i>Ubicación en la CPE</h6>
            <div class="estructura-path">
                ${parts.join('<span class="estructura-separator"><i class="bi bi-chevron-right"></i></span>')}
            </div>
        </div>
    `;
}

// Convert number to Roman numerals
function toRoman(num) {
    const romanNumerals = [
        ['X', 10], ['IX', 9], ['V', 5], ['IV', 4], ['I', 1]
    ];
    let result = '';
    for (const [roman, value] of romanNumerals) {
        while (num >= value) {
            result += roman;
            num -= value;
        }
    }
    return result;
}
