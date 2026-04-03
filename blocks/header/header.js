import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

const isDesktop = window.matchMedia('(min-width: 900px)');

function closeOnEscape(e) {
  if (e.code === 'Escape') {
    const nav = document.getElementById('nav');
    const expanded = nav.getAttribute('aria-expanded') === 'true';
    if (!isDesktop.matches && expanded) {
      // eslint-disable-next-line no-use-before-define
      toggleMenu(nav, false);
    }
    nav.querySelectorAll('.nav-drop[aria-expanded="true"]').forEach((drop) => {
      drop.setAttribute('aria-expanded', 'false');
    });
    const searchOverlay = nav.closest('.nav-wrapper')?.querySelector('.nav-search-overlay');
    if (searchOverlay) searchOverlay.classList.remove('nav-search-open');
  }
}

function toggleAllNavSections(sections, expanded = false) {
  if (!sections) return;
  sections.querySelectorAll('.nav-drop').forEach((section) => {
    section.setAttribute('aria-expanded', expanded);
  });
}

function toggleMenu(nav, forceExpanded = null) {
  const expanded = forceExpanded !== null ? !forceExpanded : nav.getAttribute('aria-expanded') === 'true';
  const button = nav.querySelector('.nav-hamburger button');
  document.body.style.overflowY = (expanded || isDesktop.matches) ? '' : 'hidden';
  nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  button.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');

  const navSections = nav.querySelector('.nav-sections');
  if (navSections) toggleAllNavSections(navSections, false);

  if (!expanded || isDesktop.matches) {
    window.addEventListener('keydown', closeOnEscape);
  } else {
    window.removeEventListener('keydown', closeOnEscape);
  }
}

function buildSearch() {
  const searchOverlay = document.createElement('div');
  searchOverlay.className = 'nav-search-overlay';
  searchOverlay.setAttribute('aria-hidden', 'true');
  searchOverlay.innerHTML = `
    <div class="nav-search-container">
      <span class="nav-search-icon-left" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      </span>
      <input type="search" id="nav-search-input" class="nav-search-input" placeholder="Cerca..." autocomplete="off">
      <button class="nav-search-submit" type="button">Cerca</button>
      <button class="nav-search-close" aria-label="Chiudi ricerca">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  `;

  searchOverlay.querySelector('.nav-search-close').addEventListener('click', () => {
    searchOverlay.classList.remove('nav-search-open');
    searchOverlay.setAttribute('aria-hidden', 'true');
  });

  return searchOverlay;
}

function decorateDropdowns(navSections) {
  navSections.querySelectorAll(':scope .default-content-wrapper > ul > li').forEach((navItem) => {
    if (navItem.querySelector('ul')) {
      navItem.classList.add('nav-drop');
      navItem.setAttribute('aria-expanded', 'false');

      const topLink = navItem.querySelector(':scope > a');
      if (topLink) {
        const toggle = document.createElement('button');
        toggle.className = 'nav-drop-toggle';
        toggle.setAttribute('aria-label', `Espandi ${topLink.textContent.trim()}`);
        toggle.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';
        toggle.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const isExpanded = navItem.getAttribute('aria-expanded') === 'true';
          navItem.closest('ul').querySelectorAll('.nav-drop').forEach((drop) => {
            if (drop !== navItem) drop.setAttribute('aria-expanded', 'false');
          });
          navItem.setAttribute('aria-expanded', isExpanded ? 'false' : 'true');
        });
        topLink.after(toggle);

        // Mobile: clicking the link toggles accordion instead of navigating
        topLink.addEventListener('click', (e) => {
          if (!isDesktop.matches) {
            e.preventDefault();
            const isExpanded = navItem.getAttribute('aria-expanded') === 'true';
            navItem.closest('ul').querySelectorAll('.nav-drop').forEach((drop) => {
              if (drop !== navItem) drop.setAttribute('aria-expanded', 'false');
            });
            navItem.setAttribute('aria-expanded', isExpanded ? 'false' : 'true');
          }
        });

        // Desktop: hover to open
        navItem.addEventListener('mouseenter', () => {
          if (isDesktop.matches) {
            navItem.closest('ul').querySelectorAll('.nav-drop').forEach((drop) => {
              if (drop !== navItem) drop.setAttribute('aria-expanded', 'false');
            });
            navItem.setAttribute('aria-expanded', 'true');
          }
        });
        navItem.addEventListener('mouseleave', () => {
          if (isDesktop.matches) {
            navItem.setAttribute('aria-expanded', 'false');
          }
        });
      }

      navItem.addEventListener('click', (e) => {
        if (!isDesktop.matches && e.target === navItem) {
          const isExpanded = navItem.getAttribute('aria-expanded') === 'true';
          toggleAllNavSections(navItem.closest('.nav-sections'));
          navItem.setAttribute('aria-expanded', isExpanded ? 'false' : 'true');
        }
      });
    }
  });
}

export default async function decorate(block) {
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  const fragment = await loadFragment(navPath);

  block.textContent = '';
  const nav = document.createElement('nav');
  nav.id = 'nav';
  while (fragment.firstElementChild) nav.append(fragment.firstElementChild);

  const classes = ['brand', 'sections', 'tools'];
  classes.forEach((c, i) => {
    const section = nav.children[i];
    if (section) section.classList.add(`nav-${c}`);
  });

  // DA compatibility: unwrap <p> tags inside <li> elements
  // DA wraps links in <p>: <li><p><a>text</a></p></li>
  // Our CSS/JS expects: <li><a>text</a></li>
  nav.querySelectorAll('li > p').forEach((p) => {
    const li = p.parentElement;
    while (p.firstChild) li.insertBefore(p.firstChild, p);
    p.remove();
  });

  // Clean up brand link
  const navBrand = nav.querySelector('.nav-brand');
  if (navBrand) {
    const brandLink = navBrand.querySelector('.button');
    if (brandLink) {
      brandLink.className = '';
      brandLink.closest('.button-container')?.classList.remove('button-container');
    }
    const brandP = navBrand.querySelector('p');
    if (brandP) brandP.className = '';
  }

  // Decorate dropdowns
  const navSections = nav.querySelector('.nav-sections');
  if (navSections) {
    decorateDropdowns(navSections);
  }

  // Clean up tools section
  const navTools = nav.querySelector('.nav-tools');
  if (navTools) {
    navTools.querySelectorAll('.button').forEach((btn) => {
      btn.className = '';
    });
    navTools.querySelectorAll('.button-container').forEach((bc) => {
      bc.className = '';
    });
  }

  // Search trigger stays in .nav-tools (Row 1)
  const searchTriggerP = navTools?.querySelector('.icon-search')?.closest('p');
  if (searchTriggerP) {
    searchTriggerP.classList.add('nav-search-trigger');
    searchTriggerP.setAttribute('role', 'button');
    searchTriggerP.setAttribute('tabindex', '0');
    searchTriggerP.setAttribute('aria-label', 'Apri ricerca');
  }

  // Build mobile search bar (appears between header bar and nav items)
  const mobileSearch = document.createElement('div');
  mobileSearch.className = 'nav-mobile-search';
  mobileSearch.innerHTML = `
    <input type="search" class="nav-mobile-search-input" placeholder="Cerca..." autocomplete="off">
    <button class="nav-mobile-search-btn" aria-label="Cerca">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
    </button>
  `;

  // Build mobile search toggle (🔍 in header bar, next to hamburger)
  const mobileSearchToggle = document.createElement('button');
  mobileSearchToggle.className = 'nav-mobile-search-toggle';
  mobileSearchToggle.setAttribute('aria-label', 'Cerca');
  mobileSearchToggle.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
  mobileSearchToggle.addEventListener('click', () => {
    const isOpen = mobileSearch.classList.contains('nav-mobile-search-open');
    mobileSearch.classList.toggle('nav-mobile-search-open');
    if (!isOpen) {
      mobileSearch.querySelector('.nav-mobile-search-input')?.focus();
    }
  });

  // Build hamburger
  const hamburger = document.createElement('div');
  hamburger.classList.add('nav-hamburger');
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
      <span class="nav-hamburger-icon"></span>
    </button>`;
  hamburger.addEventListener('click', () => toggleMenu(nav));
  nav.prepend(hamburger);
  nav.insertBefore(mobileSearchToggle, hamburger);
  nav.setAttribute('aria-expanded', 'false');

  document.addEventListener('click', (e) => {
    if (!nav.contains(e.target)) {
      toggleAllNavSections(navSections, false);
    }
  });

  // Insert mobile search between brand and sections
  const navSectionsEl = nav.querySelector('.nav-sections');
  if (navSectionsEl) {
    navSectionsEl.before(mobileSearch);
  }

  toggleMenu(nav, isDesktop.matches);
  isDesktop.addEventListener('change', () => toggleMenu(nav, isDesktop.matches));

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);

  // Build search overlay and attach
  const searchOverlay = buildSearch();
  navWrapper.append(searchOverlay);

  // Wire up search trigger
  if (searchTriggerP) {
    searchTriggerP.addEventListener('click', (e) => {
      e.preventDefault();
      const isOpen = searchOverlay.classList.contains('nav-search-open');
      if (isOpen) {
        searchOverlay.classList.remove('nav-search-open');
        searchOverlay.setAttribute('aria-hidden', 'true');
      } else {
        searchOverlay.classList.add('nav-search-open');
        searchOverlay.setAttribute('aria-hidden', 'false');
        setTimeout(() => searchOverlay.querySelector('.nav-search-input')?.focus(), 350);
      }
    });
  }

  block.append(navWrapper);
}
