import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

const SOCIAL_SVGS = {
  linkedin: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>',
  facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
  youtube: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/></svg>',
};

function buildAccordion(ul) {
  const accordion = document.createElement('div');
  accordion.className = 'footer-accordion';
  accordion.setAttribute('aria-expanded', 'false');

  const toggle = document.createElement('button');
  toggle.className = 'footer-accordion-toggle';
  toggle.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>';
  toggle.addEventListener('click', () => {
    const expanded = accordion.getAttribute('aria-expanded') === 'true';
    accordion.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  });

  const content = document.createElement('div');
  content.className = 'footer-accordion-content';
  content.append(ul);

  accordion.append(toggle, content);
  return accordion;
}

export default async function decorate(block) {
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';
  const fragment = await loadFragment(footerPath);

  block.textContent = '';

  const allElements = [];
  const wrappers = fragment.querySelectorAll('.default-content-wrapper');
  if (wrappers.length > 0) {
    wrappers.forEach((w) => {
      [...w.children].forEach((child) => allElements.push(child));
    });
  } else {
    [...fragment.children].forEach((child) => allElements.push(child));
  }

  const topEls = [];
  const bottomEls = [];
  let isBottom = false;
  allElements.forEach((el) => {
    if (el.tagName === 'HR') {
      isBottom = true;
    } else if (isBottom) {
      bottomEls.push(el);
    } else {
      topEls.push(el);
    }
  });

  // === TOP SECTION ===
  const footerTop = document.createElement('div');
  footerTop.className = 'footer-top';

  const col1 = document.createElement('div');
  col1.className = 'footer-col-1';
  const col2 = document.createElement('div');
  col2.className = 'footer-col-2';
  const col3 = document.createElement('div');
  col3.className = 'footer-col-3';

  let ulCount = 0;
  topEls.forEach((el) => {
    if (el.tagName === 'UL') {
      ulCount += 1;
      // Wrap each <ul> in an accordion for mobile
      const accordion = buildAccordion(el);
      if (ulCount === 1) col2.append(accordion);
      else col3.append(accordion);
    } else {
      col1.append(el);
    }
  });

  footerTop.append(col1, col2, col3);

  // === BOTTOM SECTION ===
  const footerBottom = document.createElement('div');
  footerBottom.className = 'footer-bottom';

  const socialRow = document.createElement('div');
  socialRow.className = 'footer-social';
  const copyrightRow = document.createElement('div');
  copyrightRow.className = 'footer-copyright';

  bottomEls.forEach((el) => {
    if (el.tagName === 'P' && el.querySelectorAll('a').length >= 2) {
      el.querySelectorAll('a').forEach((a) => {
        const name = a.textContent.trim().toLowerCase();
        const icon = document.createElement('a');
        icon.href = a.href;
        icon.className = 'footer-social-icon';
        icon.setAttribute('aria-label', a.textContent.trim());
        icon.innerHTML = SOCIAL_SVGS[name] || name.charAt(0);
        socialRow.append(icon);
      });
    } else if (el.tagName === 'P') {
      copyrightRow.append(el);
    }
  });

  footerBottom.append(socialRow, copyrightRow);

  const wrapper = document.createElement('div');
  wrapper.append(footerTop, footerBottom);
  block.append(wrapper);
}
