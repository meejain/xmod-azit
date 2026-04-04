/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: AstraZeneca section breaks.
 * Adds section breaks (<hr>) between template sections.
 * Selectors from captured DOM of www.astrazeneca.it press release pages.
 * Template sections: section-1 (.heroFeature), section-2 (.pt-article__body)
 */

export default function transform(hookName, element, payload) {
  if (hookName === 'afterTransform') {
    const { document } = payload;
    const sections = payload.template && payload.template.sections;
    if (!sections || sections.length < 2) return;

    // Process sections in reverse order to preserve DOM positions
    const sectionElements = [];
    for (const section of sections) {
      const selectors = Array.isArray(section.selector) ? section.selector : [section.selector];
      let sectionEl = null;
      for (const sel of selectors) {
        sectionEl = element.querySelector(sel);
        if (sectionEl) break;
      }
      if (sectionEl) {
        sectionElements.push({ section, el: sectionEl });
      }
    }

    // Add section breaks and section-metadata in reverse order
    for (let i = sectionElements.length - 1; i >= 0; i--) {
      const { section, el } = sectionElements[i];

      // Add section-metadata block if section has a style
      if (section.style) {
        const metaBlock = WebImporter.Blocks.createBlock(document, {
          name: 'Section Metadata',
          cells: { style: section.style },
        });
        el.append(metaBlock);
      }

      // Add <hr> before each section except the first
      if (i > 0) {
        const hr = document.createElement('hr');
        el.parentNode.insertBefore(hr, el);
      }
    }
  }
}
