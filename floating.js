
let entriesData = [];
const activeCards = [];
let flyAnimationId = null;

// Track scroll positions for mobile modal restore
let savedStageScroll = 0;
let savedWindowScroll = 0;
let isListView = false;

document.addEventListener('DOMContentLoaded', () => {
  initSite();
});

async function initSite() {
  const closeBtn = document.getElementById('detail-close-btn');
  const backdrop = document.getElementById('detail-backdrop');
  const stage = document.getElementById('entries-panel');
  const toggleBtn = document.getElementById('view-toggle-btn');

  if (closeBtn) closeBtn.addEventListener('click', closeDetail);
  if (backdrop) backdrop.addEventListener('click', closeDetail);
  if (toggleBtn) toggleBtn.addEventListener('click', toggleDesktopView);

  if (stage) {
    stage.addEventListener('click', (e) => {
      if (e.target === stage && window.innerWidth > 768) {
        resetToFallback();
      }
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDetail();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth <= 768 && flyAnimationId) {
      cancelAnimationFrame(flyAnimationId);
      flyAnimationId = null;
    } else if (window.innerWidth > 768 && !flyAnimationId && activeCards.length > 0 && !isListView) {
      animate();
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
    <h1>Selected Reviews</h1>
    <p>Select a book below to inspect its details and read the review.</p>
  `;
  stage.appendChild(mobileHeader);

  const stageWidth = stage.clientWidth || window.innerWidth * 0.618;
  const stageHeight = stage.clientHeight || window.innerHeight;
  const cardWidth = 160;
  const cardHeight = 220;

  entries.forEach((entry, index) => {
    const card = document.createElement('article');
    card.className = 'entry-card';
    
    // Fallback slug generation if slug is omitted in JSON
    const cardSlug = entry.slug || `entry-${index}`;
    card.setAttribute('data-slug', cardSlug);

    const imageSrc = resolveImagePath(entry.cover_image);
    const mediaHTML = imageSrc
      ? `<img class="entry-image" src="${imageSrc}" alt="${entry.title || 'Book cover'}">`
      : '';

    card.innerHTML = `
      ${mediaHTML}
      <h2>${entry.title || 'Untitled'}</h2>
    `;

    const speedMultiplier = 0.5;
    const state = {
      element: card,
      x: Math.random() * Math.max(0, stageWidth - cardWidth),
      y: Math.random() * Math.max(0, stageHeight - cardHeight),
      vx: (Math.random() - 0.5) * speedMultiplier,
      vy: (Math.random() - 0.5) * speedMultiplier,
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

  if (window.innerWidth > 768 && !isListView) {
    if (flyAnimationId) cancelAnimationFrame(flyAnimationId);
    animate();
  }
}

function animate() {
  if (window.innerWidth <= 768 || isListView) return;

  const stage = document.getElementById('entries-panel');
  if (!stage) return;

  const stageWidth = stage.clientWidth;
  const stageHeight = stage.clientHeight;
  const cardWidth = 160;
  const cardHeight = 220;

  activeCards.forEach((item) => {
    item.x += item.vx;
    item.y += item.vy;

    if (item.x <= 0) {
      item.x = 0;
      item.vx *= -1;
    } else if (item.x >= stageWidth - cardWidth) {
      item.x = Math.max(0, stageWidth - cardWidth);
      item.vx *= -1;
    }

    if (item.y <= 0) {
      item.y = 0;
      item.vy *= -1;
    } else if (item.y >= stageHeight - cardHeight) {
      item.y = Math.max(0, stageHeight - cardHeight);
      item.vy *= -1;
    }

    item.element.style.transform = `translate(${item.x}px, ${item.y}px)`;
  });

  flyAnimationId = requestAnimationFrame(animate);
}

function populateDetailContent(entry) {
  const detailContainer = document.getElementById('detail-content');
  if (!detailContainer) return;

  const imageSrc = resolveImagePath(entry.cover_image);

  detailContainer.innerHTML = `
    <h1 id="detail-title">${entry.title || ''}</h1>
    <p id="detail-meta">
      ${entry.verlag ? `<span>${entry.verlag}</span>` : ''}
      ${entry.jahr ? `<span> (${entry.jahr})</span>` : ''}
    </p>
    ${imageSrc ? `<div id="detail-media"><img src="${imageSrc}" alt="${entry.title || ''}"></div>` : ''}
    <div id="detail-description">${entry.review || ''}</div>
  `;
}

function resetToFallback() {
  const detailContainer = document.getElementById('detail-content');
  if (!detailContainer) return;

  detailContainer.innerHTML = `
    <div class="default-fallback">
      <h1 class="fallback-title">Selected Reviews</h1>
      <p class="fallback-intro">
        Select any book from the floating canvas to inspect its details and read the full review.
      </p>
    </div>
  `;
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

  if (window.innerWidth <= 768) {
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

  if (window.innerWidth > 768) {
    resetToFallback();
  } else {
    requestAnimationFrame(() => {
      if (stage) stage.scrollTop = savedStageScroll;
      window.scrollTo(0, savedWindowScroll);
    });
  }
}

function toggleDesktopView() {
  if (window.innerWidth <= 768) return;

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