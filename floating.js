
let entriesData = [];
const activeCards = [];
let flyAnimationId = null;

// Track scroll positions for mobile modal restore
let savedStageScroll = 0;
let savedWindowScroll = 0;
let isListView = false;
let fallbackHTML = '';

const CARD_WIDTH = 160;
const CARD_HEIGHT = 220;
const SPEED = 0.5;
const MOBILE_BREAKPOINT = 768;

document.addEventListener('DOMContentLoaded', () => {
  initSite();
});

async function initSite() {
  const closeBtn = document.getElementById('detail-close-btn');
  const backdrop = document.getElementById('detail-backdrop');
  const stage = document.getElementById('entries-panel');
  const toggleBtn = document.getElementById('view-toggle-btn');

  const detailContainer = document.getElementById('detail-content');
  fallbackHTML = detailContainer ? detailContainer.innerHTML : '';

  if (closeBtn) closeBtn.addEventListener('click', closeDetail);
  if (backdrop) backdrop.addEventListener('click', closeDetail);
  if (toggleBtn) toggleBtn.addEventListener('click', toggleDesktopView);

  if (stage) {
    stage.addEventListener('click', (e) => {
      if (e.target === stage && window.innerWidth > MOBILE_BREAKPOINT) {
        resetToFallback();
      }
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDetail();
  });

  window.addEventListener('resize', () => {
    const stage = document.getElementById('entries-panel');
    if (!stage) return;

    if (window.innerWidth <= MOBILE_BREAKPOINT) {
      if (flyAnimationId) {
        cancelAnimationFrame(flyAnimationId);
        flyAnimationId = null;
      }
      activeCards.forEach(item => { item.element.style.transform = ''; });
      stage.classList.add('list-mode');
    } else {
      stage.classList.toggle('list-mode', isListView);
      if (!flyAnimationId && activeCards.length > 0 && !isListView) {
        animate();
      }
    }
  });

  try {
    // Relative path lookup ensures data loads correctly under subfolder hosts like GitHub Pages
    const response = await fetch('./content/entries.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    entriesData = Array.isArray(data) ? data : (data.entries || []);

    renderEntries(entriesData);
  } catch (err) {
    console.error('Error loading JSON data:', err);
  }
}

// Helper to normalize image paths saved via Pages CMS or manual relative entry
function resolveImagePath(path) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return path.startsWith('/') ? `.${path}` : `./${path}`;
}

function renderEntries(entries) {
  const stage = document.getElementById('entries-panel');
  if (!stage) return;

  stage.innerHTML = '';
  activeCards.length = 0;

  const mobileHeader = document.createElement('div');
  mobileHeader.className = 'mobile-intro-header';
  mobileHeader.innerHTML = `
    <div class="default-fallback">
          <h1 class="fallback-title">Titel Blog</h1>
          <p class="fallback-intro">(Klick auf eines der Cover)</p>

          <div class="about-section">
            <p class="about-text">
              Beschreibung Blog  Beschreibung Blog Beschreibung Blog Beschreibung Blog Beschreibung Blog Beschreibung Blog Beschreibung Blog Beschreibung Blog Beschreibung Blog Beschreibung Blog Beschreibung Blog Beschreibung Blog
            </p>
          </div>

          <a class="link" href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer">
            Instagram
          </a>
        </div>
  `;
  stage.appendChild(mobileHeader);

  if (window.innerWidth <= MOBILE_BREAKPOINT) stage.classList.add('list-mode');

  const stageWidth = stage.clientWidth || window.innerWidth * 0.618;
  const stageHeight = stage.clientHeight || window.innerHeight;

  entries.forEach((entry, index) => {
    const imageSrc = resolveImagePath(entry.cover_image);

    const card = document.createElement('article');
    card.className = imageSrc ? 'entry-card' : 'entry-card entry-card--text';

    // Fallback slug generation if slug is omitted in JSON
    const cardSlug = entry.slug || `entry-${index}`;
    card.setAttribute('data-slug', cardSlug);

    const mediaHTML = imageSrc
      ? `<img class="entry-image" src="${imageSrc}" alt="${entry.title || 'Book cover'}">`
      : '';

    card.innerHTML = `
    ${mediaHTML}
    <div class="card-info">
        <h2>${entry.title || 'Untitled'}</h2>
        ${entry.autor ? `<p class="card-author">${entry.autor}</p>` : ''}
        ${entry.verlag ? `<p class="card-publisher">${entry.verlag}</p>` : ''}
    </div>
    `;
    const state = {
      element: card,
      x: Math.random() * Math.max(0, stageWidth - CARD_WIDTH),
      y: Math.random() * Math.max(0, stageHeight - CARD_HEIGHT),
      vx: (Math.random() - 0.5) * SPEED,
      vy: (Math.random() - 0.5) * SPEED,
      slug: cardSlug
    };

    if (Math.abs(state.vx) < 0.15) state.vx = state.vx < 0 ? -0.2 : 0.2;
    if (Math.abs(state.vy) < 0.15) state.vy = state.vy < 0 ? -0.2 : 0.2;

    card.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showDetail(cardSlug);
    });

    stage.appendChild(card);
    activeCards.push(state);
  });

  if (window.innerWidth > MOBILE_BREAKPOINT && !isListView) {
    if (flyAnimationId) cancelAnimationFrame(flyAnimationId);
    animate();
  }
}

function animate() {
  if (window.innerWidth <= MOBILE_BREAKPOINT || isListView) return;

  const stage = document.getElementById('entries-panel');
  if (!stage) return;

  const stageWidth = stage.clientWidth;
  const stageHeight = stage.clientHeight;

  activeCards.forEach((item) => {
    item.x += item.vx;
    item.y += item.vy;

    if (item.x <= 0) {
      item.x = 0;
      item.vx *= -1;
    } else if (item.x >= stageWidth - CARD_WIDTH) {
      item.x = Math.max(0, stageWidth - CARD_WIDTH);
      item.vx *= -1;
    }

    if (item.y <= 0) {
      item.y = 0;
      item.vy *= -1;
    } else if (item.y >= stageHeight - CARD_HEIGHT) {
      item.y = Math.max(0, stageHeight - CARD_HEIGHT);
      item.vy *= -1;
    }

    item.element.style.transform = `translate(${item.x}px, ${item.y}px)`;
  });

  flyAnimationId = requestAnimationFrame(animate);
}

function formatReview(text) {
  const str = (text || '').trim();

  // Content saved by the CMS rich-text widget is already HTML — pass through as-is
  if (/<\/?[a-z][\s\S]*>/i.test(str)) return str;

  // Adapt to how the CMS stored line breaks:
  // - blank-line separation (\n\n) → paragraphs
  // - single newlines only (plain textarea) → treat each line as a paragraph
  const parts = /\n\s*\n/.test(str) ? str.split(/\n\s*\n/) : str.split(/\n+/);

  return parts
    .map(p => p.trim().replace(/\*([^*\n]+)\*/g, '<em>$1</em>'))
    .filter(Boolean)
    .map((p) => {
      if (p.startsWith('>')) {
        return `<blockquote>${p.replace(/^\s*>\s?/, '')}</blockquote>`;
      }
      return `<p>${p}</p>`;
    })
    .join('');
}

function populateDetailContent(entry) {
  const detailContainer = document.getElementById('detail-content');
  if (!detailContainer) return;
  const panel = document.getElementById('detail-panel');

  const imageSrc = resolveImagePath(entry.cover_image);

  detailContainer.innerHTML = `
    <h1 id="detail-title">${entry.title || ''}</h1>
    <p id="detail-meta">
      ${entry.autor ? `<span>${entry.autor}</span>` : ''}
      ${entry.verlag ? `<span> · ${entry.verlag}</span>` : ''}
      ${entry.seitenzahl ? `<span> · ${entry.seitenzahl} Seiten</span>` : ''}
      ${entry.jahr ? `<span> · ${entry.jahr}</span>` : ''}
    </p>
    ${imageSrc ? `<div id="detail-media"><img src="${imageSrc}" alt="${entry.title || ''}"></div>` : ''}
    <div id="detail-description">${formatReview(entry.review)}</div>
    <button class="back-to-top" type="button">↑ Nach oben</button>
  `;

  const backBtn = detailContainer.querySelector('.back-to-top');
  if (backBtn && panel) {
    backBtn.addEventListener('click', () => { panel.scrollTop = 0; });
  }
}

function resetToFallback() {
  const detailContainer = document.getElementById('detail-content');
  if (!detailContainer) return;
  detailContainer.innerHTML = fallbackHTML;
}

function showDetail(slug) {
  const entry = entriesData.find((e, index) => (e.slug || `entry-${index}`) === slug);
  if (!entry) return;

  populateDetailContent(entry);
  openDetail();
}

function openDetail() {
  const stage = document.getElementById('entries-panel');
  const panel = document.getElementById('detail-panel');
  const backdrop = document.getElementById('detail-backdrop');

  if (window.innerWidth <= MOBILE_BREAKPOINT) {
    savedStageScroll = stage ? stage.scrollTop : 0;
    savedWindowScroll = window.scrollY || window.pageYOffset || 0;
  }

  if (panel) {
    panel.classList.add('open');
    panel.scrollTop = 0;
  }
  if (backdrop) backdrop.classList.add('active');
}

function closeDetail() {
  const stage = document.getElementById('entries-panel');
  const panel = document.getElementById('detail-panel');
  const backdrop = document.getElementById('detail-backdrop');

  if (panel) panel.classList.remove('open');
  if (backdrop) backdrop.classList.remove('active');

  if (window.innerWidth > MOBILE_BREAKPOINT) {
    resetToFallback();
  } else {
    requestAnimationFrame(() => {
      if (stage) stage.scrollTop = savedStageScroll;
      window.scrollTo(0, savedWindowScroll);
    });
  }
}

function toggleDesktopView() {
  if (window.innerWidth <= MOBILE_BREAKPOINT) return;

  const stage = document.getElementById('entries-panel');
  const toggleBtn = document.getElementById('view-toggle-btn');
  const btnText = toggleBtn ? toggleBtn.querySelector('.btn-text') : null;

  isListView = !isListView;

  if (isListView) {
    if (flyAnimationId) {
      cancelAnimationFrame(flyAnimationId);
      flyAnimationId = null;
    }
    
    activeCards.forEach(item => {
      item.element.style.transform = '';
    });

    if (stage) stage.classList.add('list-mode');
    if (btnText) btnText.textContent = 'Floating View';
  } else {
    if (stage) stage.classList.remove('list-mode');
    if (btnText) btnText.textContent = 'List View';
    
    animate();
  }
}