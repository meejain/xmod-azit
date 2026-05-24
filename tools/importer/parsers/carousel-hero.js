/* eslint-disable */
/* global WebImporter */

/**
 * Parser for carousel-hero
 * Base block: carousel
 * Source: https://azhealthclub.com.hk/
 * Selector: .homepage-slider-banner
 * Generated: 2026-05-24
 *
 * Extracts carousel slides from the homepage hero banner.
 * Each slide becomes a row with: [image] | [heading, description, optional CTA]
 */
export default function parse(element, { document }) {
  // Find all carousel slide items
  const slides = element.querySelectorAll('.carousel-item');
  const cells = [];

  slides.forEach((slide) => {
    // Extract the banner image from this slide
    const image = slide.querySelector('img.d-block, img.w-100, img[class*="d-block"]');

    // Extract caption content
    const caption = slide.querySelector('.carousel-caption');
    const heading = caption ? caption.querySelector('h2.home-banner-title, h2, h1') : null;
    const description = caption ? caption.querySelector('p.lead, p') : null;
    const ctaLinks = caption ? Array.from(caption.querySelectorAll('a')) : [];

    // Build image cell
    const imageCell = [];
    if (image) {
      imageCell.push(image);
    }

    // Build content cell with heading, description, and optional CTAs
    const contentCell = [];
    if (heading) contentCell.push(heading);
    if (description) contentCell.push(description);
    if (ctaLinks.length > 0) contentCell.push(...ctaLinks);

    // Each slide is a row with two columns: [image, content]
    if (imageCell.length > 0 || contentCell.length > 0) {
      cells.push([imageCell.length > 0 ? imageCell : '', contentCell.length > 0 ? contentCell : '']);
    }
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'carousel-hero', cells });
  element.replaceWith(block);
}
