/**
 * Articles explorer: grid, search, category dropdown, pagination, detail modal.
 * Talks to the /api/articles endpoint.
 */
import { Modal } from 'bootstrap';

const ARTICLES_API = '/api/articles';

interface Tematica {
  titulo: string;
  articulos: number[];
}

interface ArticleListItem {
  id: number;
  titulo?: string;
  presentacion?: string;
}

const state = {
  articles: [] as ArticleListItem[],
  filteredArticles: [] as ArticleListItem[],
  tematicas: [] as Tematica[],
  selectedTematica: null as string | null,
  currentPage: 1,
  articlesPerPage: 24,
  currentArticle: null as any,
  articlesVisible: false,
};

export async function initArticles(): Promise<void> {
  const articlesGrid = document.getElementById('articlesGrid');
  const articleSearch = document.getElementById('articleSearch') as HTMLInputElement | null;

  if (!articlesGrid) return;

  // Expose detail opener so the chat widget can link to articles.
  (window as any).showArticleDetail = showArticleDetail;

  try {
    const response = await fetch(ARTICLES_API);
    if (!response.ok) throw new Error('Failed to load articles');

    const data = await response.json();
    state.articles = data.articulos || [];
    state.tematicas = data.tematicas || [];
    state.filteredArticles = [...state.articles];

    initCategoryDropdown();
    showAllArticles();
  } catch (error) {
    console.error('Error loading articles:', error);
    articlesGrid.innerHTML = `
      <div class="col-12 text-center py-5">
        <i class="bi bi-exclamation-triangle text-warning" style="font-size: 3rem;"></i>
        <p class="text-muted mt-2">No se pudieron cargar los artículos</p>
      </div>
    `;
  }

  if (articleSearch) {
    articleSearch.addEventListener('input', (e) => {
      const query = (e.target as HTMLInputElement).value.toLowerCase().trim();
      state.selectedTematica = null;
      const categoryLabel = document.getElementById('categoryLabel');
      if (categoryLabel) categoryLabel.textContent = 'Todas las categorías';
      filterArticles(query);
    });
  }

  const askAboutBtn = document.getElementById('askAboutArticle');
  if (askAboutBtn) {
    askAboutBtn.addEventListener('click', () => {
      if (!state.currentArticle) return;
      const articleId = state.currentArticle.id;
      const chatInput = document.getElementById('userInput') as HTMLTextAreaElement | null;
      const chatSendBtn = document.getElementById('sendBtn') as HTMLButtonElement | null;
      const chatWin = document.getElementById('chatWindow');
      const chatToggle = document.getElementById('chatToggleBtn');

      if (chatWin && !chatWin.classList.contains('open')) {
        chatWin.classList.add('open');
        document.body.classList.add('chat-open');
        chatToggle?.classList.add('hidden');
        document.getElementById('chatBackdrop')?.classList.add('show');
      }

      if (chatInput) {
        chatInput.disabled = false;
        chatInput.readOnly = false;
        chatInput.value = `Explícame el Artículo ${articleId} de la Constitución`;
      }
      if (chatSendBtn) chatSendBtn.disabled = false;

      setTimeout(() => {
        chatInput?.focus();
        chatInput?.select();
      }, 100);
    });
  }
}

function initCategoryDropdown(): void {
  const categorySelect = document.getElementById('categorySelect');
  const categoryMenu = document.getElementById('categoryMenu');
  const categoryLabel = document.getElementById('categoryLabel');
  const categoryOptions = document.getElementById('categoryOptions');
  const categorySearchInput = document.getElementById('categorySearchInput') as HTMLInputElement | null;

  if (!categorySelect || !categoryMenu || !categoryLabel || !categoryOptions || !categorySearchInput) return;
  if (!state.tematicas.length) return;

  function renderOptions(filter = ''): void {
    const filterLower = filter.toLowerCase();
    let filtered = filterLower
      ? state.tematicas.filter((t) => t.titulo.toLowerCase().includes(filterLower))
      : state.tematicas.slice(0, 10);

    if (filtered.length === 0) {
      categoryOptions!.innerHTML = `<div class="category-no-results">No se encontraron categorías</div>`;
      return;
    }

    let html = `
      <div class="category-option ${!state.selectedTematica ? 'selected' : ''}" data-tematica="">
        <span class="category-name">Todas las categorías</span>
        <span class="category-count">${state.articles.length}</span>
      </div>
    `;

    filtered.forEach((t) => {
      const isSelected = state.selectedTematica === t.titulo;
      html += `
        <div class="category-option ${isSelected ? 'selected' : ''}" data-tematica="${t.titulo}">
          <span class="category-name">${t.titulo}</span>
          <span class="category-count">${t.articulos.length}</span>
        </div>
      `;
    });

    categoryOptions!.innerHTML = html;

    categoryOptions!.querySelectorAll<HTMLElement>('.category-option').forEach((option) => {
      option.addEventListener('click', () => {
        selectCategory(option.dataset.tematica || '');
        closeDropdown();
      });
    });
  }

  function selectCategory(tematica: string): void {
    state.selectedTematica = tematica || null;

    if (tematica) {
      const tema = state.tematicas.find((t) => t.titulo === tematica);
      categoryLabel!.textContent = tema ? tema.titulo : 'Todas las categorías';
    } else {
      categoryLabel!.textContent = 'Todas las categorías';
    }

    const articleSearch = document.getElementById('articleSearch') as HTMLInputElement | null;
    if (articleSearch) articleSearch.value = '';

    if (tematica) {
      const tema = state.tematicas.find((t) => t.titulo === tematica);
      if (tema) {
        state.filteredArticles = state.articles.filter((a) => tema.articulos.includes(a.id));
      }
      state.currentPage = 1;
      state.articlesVisible = true;
      displayArticles();
    } else {
      showAllArticles();
    }
  }

  function openDropdown(): void {
    categorySelect!.classList.add('open');
    categoryMenu!.classList.add('open');
    categorySearchInput!.value = '';
    renderOptions();
    setTimeout(() => categorySearchInput!.focus(), 50);
  }

  function closeDropdown(): void {
    categorySelect!.classList.remove('open');
    categoryMenu!.classList.remove('open');
    categorySearchInput!.value = '';
  }

  function toggleDropdown(): void {
    categoryMenu!.classList.contains('open') ? closeDropdown() : openDropdown();
  }

  categorySelect.addEventListener('click', toggleDropdown);
  categorySearchInput.addEventListener('input', (e) => renderOptions((e.target as HTMLInputElement).value));
  categoryMenu.addEventListener('click', (e) => e.stopPropagation());
  document.addEventListener('click', (e) => {
    if (!(e.target as HTMLElement).closest('.category-dropdown')) closeDropdown();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDropdown();
  });

  renderOptions();
}

function showAllArticles(): void {
  state.selectedTematica = null;
  state.filteredArticles = [...state.articles];
  state.currentPage = 1;
  state.articlesVisible = true;
  displayArticles();
}

function filterArticles(query: string): void {
  if (!query) {
    if (!state.selectedTematica) {
      showAllArticles();
      return;
    }
    state.filteredArticles = [...state.articles];
  } else {
    state.filteredArticles = state.articles.filter((art) => {
      const idMatch = art.id.toString().includes(query);
      const titleMatch = (art.titulo || '').toLowerCase().includes(query);
      const descMatch = (art.presentacion || '').toLowerCase().includes(query);
      return idMatch || titleMatch || descMatch;
    });
  }

  state.currentPage = 1;
  state.articlesVisible = true;
  displayArticles();
}

function displayArticles(): void {
  const articlesGrid = document.getElementById('articlesGrid')!;

  articlesGrid.innerHTML = '';

  const totalPages = Math.ceil(state.filteredArticles.length / state.articlesPerPage);
  const start = (state.currentPage - 1) * state.articlesPerPage;
  const toDisplay = state.filteredArticles.slice(start, start + state.articlesPerPage);

  if (toDisplay.length === 0) {
    articlesGrid.innerHTML = `
      <div class="col-12 text-center py-5">
        <i class="bi bi-search text-muted" style="font-size: 3rem;"></i>
        <p class="text-muted mt-2">No se encontraron artículos</p>
      </div>
    `;
    setPaginationVisible(false);
    return;
  }

  toDisplay.forEach((article) => {
    const col = document.createElement('div');
    col.className = 'col-md-6 col-lg-4';
    col.innerHTML = `
      <div class="card article-card h-100 shadow-sm" data-article-id="${article.id}">
        <div class="card-body">
          <span class="badge bg-primary mb-2">${article.titulo || 'Artículo ' + article.id}</span>
          <p class="card-text small text-muted">${
            article.presentacion ? article.presentacion.substring(0, 150) + '...' : 'Sin descripción disponible'
          }</p>
        </div>
        <div class="card-footer bg-transparent border-0">
          <button class="btn btn-sm btn-outline-primary w-100 view-article-btn">
            <i class="bi bi-eye me-1"></i>Ver detalle
          </button>
        </div>
      </div>
    `;
    col.querySelector('.view-article-btn')!.addEventListener('click', () => showArticleDetail(article.id));
    articlesGrid.appendChild(col);
  });

  if (totalPages > 1) {
    setPaginationVisible(true);
    // Top bar (#paginationTop) and bottom bar (#pagination) stay in sync.
    renderPagination(document.getElementById('paginationTop'), totalPages);
    renderPagination(document.getElementById('pagination'), totalPages);
  } else {
    setPaginationVisible(false);
  }
}

// Show/hide both pagination bars. The top bar only exists to save scrolling,
// so it follows the same rule as the bottom one (visible when there are pages).
function setPaginationVisible(visible: boolean): void {
  ['paginationContainerTop', 'paginationContainer'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = visible ? 'block' : 'none';
  });
}

function renderPagination(pagination: HTMLElement | null, totalPages: number): void {
  if (!pagination) return;
  pagination.innerHTML = '';

  const prevLi = document.createElement('li');
  prevLi.className = `page-item ${state.currentPage === 1 ? 'disabled' : ''}`;
  prevLi.innerHTML = `<a class="page-link" href="#" aria-label="Anterior"><i class="bi bi-chevron-left"></i></a>`;
  if (state.currentPage > 1) {
    prevLi.addEventListener('click', (e) => {
      e.preventDefault();
      goToPage(state.currentPage - 1);
    });
  }
  pagination.appendChild(prevLi);

  const maxVisible = 5;
  let startPage = Math.max(1, state.currentPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  if (startPage > 1) {
    pagination.appendChild(createPageItem(1));
    if (startPage > 2) pagination.appendChild(createEllipsis());
  }

  for (let i = startPage; i <= endPage; i++) {
    pagination.appendChild(createPageItem(i));
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) pagination.appendChild(createEllipsis());
    pagination.appendChild(createPageItem(totalPages));
  }

  const nextLi = document.createElement('li');
  nextLi.className = `page-item ${state.currentPage === totalPages ? 'disabled' : ''}`;
  nextLi.innerHTML = `<a class="page-link" href="#" aria-label="Siguiente"><i class="bi bi-chevron-right"></i></a>`;
  if (state.currentPage < totalPages) {
    nextLi.addEventListener('click', (e) => {
      e.preventDefault();
      goToPage(state.currentPage + 1);
    });
  }
  pagination.appendChild(nextLi);
}

function createEllipsis(): HTMLLIElement {
  const ellipsis = document.createElement('li');
  ellipsis.className = 'page-item disabled';
  ellipsis.innerHTML = '<span class="page-link">...</span>';
  return ellipsis;
}

function createPageItem(pageNum: number): HTMLLIElement {
  const li = document.createElement('li');
  li.className = `page-item ${pageNum === state.currentPage ? 'active' : ''}`;
  li.innerHTML = `<a class="page-link" href="#">${pageNum}</a>`;
  li.addEventListener('click', (e) => {
    e.preventDefault();
    goToPage(pageNum);
  });
  return li;
}

function goToPage(pageNum: number): void {
  state.currentPage = pageNum;
  displayArticles();
  document.getElementById('articulos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function showArticleDetail(articleId: number): Promise<void> {
  const modalTitle = document.getElementById('articleModalTitle')!;
  const modalBody = document.getElementById('articleModalBody')!;
  const modalEl = document.getElementById('articleModal')!;
  const modal = Modal.getOrCreateInstance(modalEl);

  modalTitle.textContent = `Artículo ${articleId}`;
  modalBody.innerHTML = `
    <div class="text-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
      <p class="text-muted mt-2">Cargando artículo...</p>
    </div>
  `;

  if (!modalEl.classList.contains('show')) modal.show();

  try {
    const response = await fetch(`${ARTICLES_API}?id=${articleId}`);
    if (!response.ok) throw new Error('Article not found');

    const article = await response.json();
    state.currentArticle = article;

    modalTitle.textContent = article.titulo || `Artículo ${articleId}`;

    let content = '';

    if (article.estructura) content += buildEstructuraBreadcrumb(article.estructura);

    if (article.articuloTranscrito) {
      content += `
        <div class="mb-4">
          <h6 class="text-primary"><i class="bi bi-file-text me-2"></i>Texto del Artículo</h6>
          <div class="p-3 bg-light rounded">${article.articuloTranscrito}</div>
        </div>
      `;
    }

    if (article.articulosRelacionados && article.articulosRelacionados.length > 0) {
      content += `
        <div class="mb-4">
          <h6 class="text-primary"><i class="bi bi-diagram-3 me-2"></i>Artículos Relacionados (${article.articulosRelacionados.length})</h6>
          <div class="related-articles">
            ${buildRelatedArticlesHTML(article.articulosRelacionados, 'main')}
          </div>
        </div>
      `;
    }

    if (article.analisis) {
      const { tematica, categoria, subcategoria } = article.analisis;
      let accordionIdx = 0;

      content += `<div class="mb-4"><h6 class="text-primary"><i class="bi bi-lightbulb me-2"></i>Análisis</h6><div class="accordion" id="analysisAccordion">`;

      (tematica || []).forEach((item: any) => {
        content += buildAccordionItem(item, 'Temática', 'bg-primary', accordionIdx++);
      });
      (categoria || []).forEach((item: any) => {
        content += buildAccordionItem(item, 'Categoría', 'bg-info', accordionIdx++);
      });
      (subcategoria || []).forEach((item: any) => {
        content += buildAccordionItem(item, 'Subcategoría', 'bg-secondary', accordionIdx++);
      });

      content += `</div></div>`;
    }

    if (!content) {
      content = '<p class="text-muted">No hay información detallada disponible para este artículo.</p>';
    }

    modalBody.innerHTML = content;

    modalBody.querySelectorAll<HTMLElement>('.related-article-btn').forEach((btn) => {
      btn.addEventListener('click', () => showArticleDetail(parseInt(btn.dataset.article!)));
    });

    modalBody.querySelectorAll<HTMLElement>('.show-more-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const groupId = btn.dataset.group;
        const hiddenContainer = modalBody.querySelector<HTMLElement>(`.hidden-articles[data-group="${groupId}"]`);
        if (hiddenContainer) {
          hiddenContainer.style.display = 'inline';
          btn.style.display = 'none';
          hiddenContainer.querySelectorAll<HTMLElement>('.related-article-btn').forEach((newBtn) => {
            newBtn.addEventListener('click', () => showArticleDetail(parseInt(newBtn.dataset.article!)));
          });
        }
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

function buildRelatedArticlesHTML(articles: number[], groupId: string, initialLimit = 15): string {
  if (!articles || articles.length === 0) return '';

  const visibleArticles = articles.slice(0, initialLimit);
  const hiddenArticles = articles.slice(initialLimit);

  let html = visibleArticles
    .map((id) => `<button class="btn btn-sm btn-outline-secondary me-1 mb-1 related-article-btn" data-article="${id}">Art. ${id}</button>`)
    .join('');

  if (hiddenArticles.length > 0) {
    html += `<span class="hidden-articles" data-group="${groupId}" style="display: none;">`;
    html += hiddenArticles
      .map((id) => `<button class="btn btn-sm btn-outline-secondary me-1 mb-1 related-article-btn" data-article="${id}">Art. ${id}</button>`)
      .join('');
    html += `</span>`;
    html += `<button class="btn btn-sm btn-primary show-more-btn" data-group="${groupId}">+${hiddenArticles.length} más</button>`;
  }

  return html;
}

function buildAccordionItem(item: any, tipo: string, badgeClass: string, idx: number): string {
  const relatedLinks =
    item.articulosRelacionados && item.articulosRelacionados.length > 0
      ? `<div class="mt-3 pt-3 border-top">
           <small class="text-muted"><strong>Concordancias:</strong></small><br>
           ${buildRelatedArticlesHTML(item.articulosRelacionados, `accordion-${idx}`)}
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

function buildEstructuraBreadcrumb(estructura: any): string {
  if (!estructura) return '';

  const parts: string[] = [];

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

function toRoman(num: number): string {
  const romanNumerals: [string, number][] = [['X', 10], ['IX', 9], ['V', 5], ['IV', 4], ['I', 1]];
  let result = '';
  for (const [roman, value] of romanNumerals) {
    while (num >= value) {
      result += roman;
      num -= value;
    }
  }
  return result;
}
