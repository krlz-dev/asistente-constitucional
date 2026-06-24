/**
 * Theme management (light / dark) with localStorage + system preference.
 * Shared across all pages.
 */
type Theme = 'light' | 'dark';

export function initTheme(): void {
  const savedTheme = localStorage.getItem('theme') as Theme | null;
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  let theme: Theme = savedTheme ?? (systemPrefersDark ? 'dark' : 'light');

  applyTheme(theme);

  const themeToggle = document.getElementById('themeToggle');
  const themeToggleMobile = document.getElementById('themeToggleMobile');

  function toggleTheme() {
    theme = theme === 'light' ? 'dark' : 'light';
    applyTheme(theme);
    localStorage.setItem('theme', theme);
  }

  themeToggle?.addEventListener('click', toggleTheme);
  themeToggleMobile?.addEventListener('click', toggleTheme);

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
      theme = e.matches ? 'dark' : 'light';
      applyTheme(theme);
    }
  });
}

function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);

  const toggles = [
    { icon: document.getElementById('themeIcon'), label: document.getElementById('themeLabel') },
    { icon: document.getElementById('themeIconMobile'), label: document.getElementById('themeLabelMobile') },
  ];

  toggles.forEach(({ icon, label }) => {
    if (icon && label) {
      if (theme === 'dark') {
        icon.className = 'bi bi-moon-fill';
        label.textContent = 'Oscuro';
      } else {
        icon.className = 'bi bi-sun-fill';
        label.textContent = 'Claro';
      }
    }
  });
}
