/* eslint-disable */
/* global WebImporter */

/**
 * Parser for columns-about
 * Base block: columns
 * Source: https://azhealthclub.com.hk/
 * Selector: .homepage_content
 * Generated: 2026-05-24
 *
 * Extracts the "About" section with two columns:
 * - Left column: heading, description paragraph, 4 small icon images
 * - Right column: large image of caregiver with elderly woman
 *
 * Uses .desktop-layout as the source container with .left-box and .right-box.
 */
export default function parse(element, { document }) {
  // Target the desktop layout container
  const desktopLayout = element.querySelector('.desktop-layout');
  if (!desktopLayout) return;

  // === LEFT COLUMN ===
  const leftBox = desktopLayout.querySelector('.left-box');
  const leftContent = [];

  if (leftBox) {
    // Extract heading (h1.green-title)
    const heading = leftBox.querySelector('h1.green-title, h2.green-title, [class*="green-title"]');
    if (heading) leftContent.push(heading);

    // Extract description paragraph (p.black-content)
    const description = leftBox.querySelector('p.black-content');
    if (description) leftContent.push(description);

    // Extract small icon images from .small-images container
    const smallImages = leftBox.querySelectorAll('.small-images .small-images-item img, .small-images > img');
    if (smallImages.length > 0) {
      smallImages.forEach((img) => leftContent.push(img));
    }
  }

  // === RIGHT COLUMN ===
  const rightBox = desktopLayout.querySelector('.right-box');
  const rightContent = [];

  if (rightBox) {
    // Extract the big image
    const bigImage = rightBox.querySelector('.big-image img, img');
    if (bigImage) rightContent.push(bigImage);
  }

  // Build cells: single row with two columns
  const cells = [
    [leftContent, rightContent],
  ];

  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-about', cells });
  element.replaceWith(block);
}
