/* eslint-disable */
/* global WebImporter */

/**
 * Parser: cards-disease
 * Base block: cards
 * Source: https://azhealthclub.com.hk/
 * Selector: .disease-grid.disease-page-cards
 * Generated: 2026-05-24
 *
 * Extracts disease category cards from the homepage grid.
 * Each card has a circular icon image and a linked heading title.
 * Structure: 2 columns per row (image | linked heading). Each row = one card.
 */
export default function parse(element, { document }) {
  // Each .disease-block contains one card with an anchor wrapping icon + title
  const diseaseBlocks = element.querySelectorAll(':scope > .disease-block');

  const cells = [];

  diseaseBlocks.forEach((block) => {
    const anchor = block.querySelector('a.disease-block-icon, a[href]');
    const img = block.querySelector('.disease-graphic img, img');
    const heading = block.querySelector('h2.disease-title, h2');

    // Cell 1: the icon image
    const imageCell = [];
    if (img) {
      imageCell.push(img);
    }

    // Cell 2: linked heading (wrap heading text in anchor to preserve link)
    const textCell = [];
    if (heading && anchor) {
      // Create a link element that wraps the heading text, preserving the href
      const link = document.createElement('a');
      link.href = anchor.href;
      link.textContent = heading.textContent;
      const h2 = document.createElement('h2');
      h2.appendChild(link);
      textCell.push(h2);
    } else if (heading) {
      textCell.push(heading);
    }

    // Only add row if we have content
    if (imageCell.length > 0 || textCell.length > 0) {
      cells.push([imageCell, textCell]);
    }
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-disease', cells });
  element.replaceWith(block);
}
