/* eslint-disable */
/* global WebImporter */

/**
 * Parser for hero-banner
 * Base block: hero
 * Source: https://azhealthclub.com.hk/
 * Selector: .page-full-width-field
 * Generated: 2026-05-24
 *
 * Structure: Simple full-width hero banner with a single image.
 * The text overlay is baked into the image itself (alt="健康伴你").
 * Row 1: The hero image (serves as both background and content).
 */
export default function parse(element, { document }) {
  // Extract the hero image from the source element
  const img = element.querySelector('img.alignnone, img.size-full, img[class*="wp-image"], img');

  const cells = [];

  // Row 1: The banner image
  if (img) {
    cells.push([img]);
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero-banner', cells });
  element.replaceWith(block);
}
