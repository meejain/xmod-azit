/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: AZ Health Club sections.
 * Inserts section breaks (<hr>) based on template sections from page-templates.json.
 * Selectors validated against captured DOM (migration-work/cleaned.html):
 *   - .homepage-slider-banner (line 56) - Hero Carousel
 *   - .homepage_content (line 101) - About Section
 *   - .home-section-3 (line 184) - Disease Categories
 *   - .page-full-width-field (line 249) - Footer Banner
 */
const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.afterTransform) {
    const { template } = payload;
    if (!template || !template.sections || template.sections.length < 2) return;

    const document = element.ownerDocument;
    const sections = template.sections;

    // Process sections in reverse order to preserve DOM positions
    for (let i = sections.length - 1; i >= 0; i--) {
      const section = sections[i];
      const sectionEl = element.querySelector(section.selector);
      if (!sectionEl) continue;

      // Add Section Metadata block if section has a style
      if (section.style) {
        const sectionMetadata = WebImporter.Blocks.createBlock(document, {
          name: 'Section Metadata',
          cells: { style: section.style },
        });
        sectionEl.after(sectionMetadata);
      }

      // Insert <hr> before each section except the first
      if (i > 0) {
        const hr = document.createElement('hr');
        sectionEl.before(hr);
      }
    }
  }
}
