/* eslint-disable */
/* global WebImporter */

/**
 * Parser for hero-press variant.
 * Base block: hero (1 column, 3 rows: name, optional image, content)
 * Source: https://www.astrazeneca.it/area-stampa/press-releases/2016/CAZ-AVI-CHMP.html
 * Source HTML: section.hero-feature--no-background > .hero-feature__wrapper > h1.hero-feature__header
 * No background image in this variant - skip image row.
 */
export default function parse(element, { document }) {
  // Extract heading from source DOM
  // Found in captured HTML: <h1 class="hero-feature__header"><div class="l-constrained">...</div></h1>
  const heading = element.querySelector('h1, h2, .hero-feature__header, [class*="header"]');

  const contentCell = [];
  if (heading) {
    // Create a clean h1 with just the text content
    const h1 = document.createElement('h1');
    h1.textContent = heading.textContent.trim();
    contentCell.push(h1);
  }

  // Hero block structure: row 1 = content (no image row for this variant)
  const cells = [contentCell];

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero-press', cells });
  element.replaceWith(block);
}
