let entriesData = [];
const activeCards = [];
let flyAnimationId = null;

// Track scroll positions
let savedStageScroll = 0;
let savedWindowScroll = 0;

document.addEventListener('DOMContentLoaded', () => {
  initSite();
});

async function initSite() {
  const closeBtn = document.getElementById('detail-close-btn');
  const backdrop = document.getElementById('detail-backdrop');
  const stage = document.getElementById('entries-panel');

  if (closeBtn) closeBtn.addEventListener('click', closeDetail);
  if (backdrop) backdrop.addEventListener('click', closeDetail);

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
    } else if (window.innerWidth > 768 && !flyAnimationId && activeCards.length > 0) {
      animate();
    }
  });

  try {
    const response = await fetch('./data/entries.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    entriesData = data.entries || data;

    renderEntries(entriesData);
  } catch (err) {
    console.error('Error loading JSON data:', err);
  }
}

function renderEntries(entries) {
  const stage = document.getElementById('entries-panel');
  if (!stage) return;

  stage.innerHTML = '';
  activeCards.length = 0;

  const mobileHeader = document.createElement('div');
  mobileHeader.className = 'mobile-intro-header';
  mobileHeader.innerHTML = `
    <h1>Selected Works</h1>
    <p>Select a project below to inspect details.</p>
  `;
  stage.appendChild(mobileHeader);

  const stageWidth = stage.clientWidth || window.innerWidth * 0.618;
  const stageHeight = stage.clientHeight || window.innerHeight;
  const cardWidth = 160;
  const cardHeight = 220;

  entries.forEach((entry) => {
    const card = document.createElement('article');
    card.className = 'entry-card';
    card.setAttribute('data-slug', entry.slug);

    const mediaHTML = entry.media_type === 'video'
      ? `<video src="${entry.cover_image}" autoplay muted loop playsinline></video>`
      : `<img class="entry-image" src="${entry.cover_image}" alt="${entry.title || 'Project entry'}">`;

    card.innerHTML = `
      ${mediaHTML}
      <h2>${entry.title || ''}</h2>
    `;

    const speedMultiplier = 0.5;
    const state = {
      element: card,
      x: Math.random() * Math.max(0, stageWidth - cardWidth),
      y: Math.random() * Math.max(0, stageHeight - cardHeight),
      vx: (Math.random() - 0.5) * speedMultiplier,
      vy: (Math.random() - 0.5) * speedMultiplier,
      slug: entry.slug
    };

    if (Math.abs(state.vx) < 0.15) state.vx = state.vx < 0 ? -0.2 : 0.2;
    if (Math.abs(state.vy) < 0.15) state.vy = state.vy < 0 ? -0.2 : 0.2;

    card.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showDetail(entry.slug);
    });

    stage.appendChild(card);
    activeCards.push(state);
  });

  if (window.innerWidth > 768) {
    if (flyAnimationId) cancelAnimationFrame(flyAnimationId);
    animate();
  }
}

function animate() {
  if (window.innerWidth <= 768) return;

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

  const mediaHTML = entry.cover_image
    ? (entry.media_type === 'video'
        ? `<video src="${entry.cover_image}" controls autoplay muted loop></video>`
        : `<img src="${entry.cover_image}" alt="${entry.title || ''}">`)
    : '';

  detailContainer.innerHTML = `
    <h1 id="detail-title">${entry.title || ''}</h1>
    <p id="detail-meta">${entry.year ? `${entry.year}` : ''}</p>
    <div id="detail-media">${mediaHTML}</div>
    <div id="detail-description">${entry.full_description || entry.description || ''}</div>
  `;
}

function resetToFallback() {
  const detailContainer = document.getElementById('detail-content');
  if (!detailContainer) return;

  detailContainer.innerHTML = `
    <div class="default-fallback">
      <h1 class="fallback-title">Selected Works</h1>
      <p class="fallback-intro">
        Select any project from the floating canvas to inspect its details, drawings, and metadata.
      </p>
    </div>
  `;
}

function showDetail(slug) {
  const entry = entriesData.find(e => e.slug === slug);
  if (!entry) return;

  populateDetailContent(entry);
  openDetail();
}

function openDetail() {
  const stage = document.getElementById('entries-panel');
  const panel = document.getElementById('detail-panel');
  const backdrop = document.getElementById('detail-backdrop');

  if (window.innerWidth <= 768) {
    // 1. Capture both stage scroll AND window scroll before opening modal
    savedStageScroll = stage ? stage.scrollTop : 0;
    savedWindowScroll = window.scrollY || window.pageYOffset || 0;
  }

  if (panel) {
    panel.classList.add('open');
    panel.scrollTop = 0; // Always reset detail view scroll to top
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
    // 2. Restore scroll position on next frame to prevent layout jumps
    requestAnimationFrame(() => {
      if (stage) stage.scrollTop = savedStageScroll;
      window.scrollTo(0, savedWindowScroll);
    });
  }
}

let isListView = false;

// Add inside initSite():
const toggleBtn = document.getElementById('view-toggle-btn');
if (toggleBtn) {
  toggleBtn.addEventListener('click', toggleDesktopView);
}

function toggleDesktopView() {
  if (window.innerWidth <= 768) return; // Keep mobile behavior intact

  const stage = document.getElementById('entries-panel');
  const toggleBtn = document.getElementById('view-toggle-btn');
  const btnText = toggleBtn ? toggleBtn.querySelector('.btn-text') : null;

  isListView = !isListView;

  if (isListView) {
    // Pause animation floating loop
    if (flyAnimationId) {
      cancelAnimationFrame(flyAnimationId);
      flyAnimationId = null;
    }
    
    // Reset individual inline transform styles from floating physics
    activeCards.forEach(item => {
      item.element.style.transform = '';
    });

    stage.classList.add('list-mode');
    if (btnText) btnText.textContent = 'Floating View';
  } else {
    stage.classList.remove('list-mode');
    if (btnText) btnText.textContent = 'List View';
    
    // Resume floating loop
    animate();
  }
}