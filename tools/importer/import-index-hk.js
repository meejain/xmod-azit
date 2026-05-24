/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import carouselHeroParser from './parsers/carousel-hero.js';
import columnsAboutParser from './parsers/columns-about.js';
import cardsDiseaseParser from './parsers/cards-disease.js';
import heroBannerParser from './parsers/hero-banner.js';

// TRANSFORMER IMPORTS
import azhealthclubCleanupTransformer from './transformers/azhealthclub-cleanup.js';
import azhealthclubSectionsTransformer from './transformers/azhealthclub-sections.js';

// PARSER REGISTRY
const parsers = {
  'carousel-hero': carouselHeroParser,
  'columns-about': columnsAboutParser,
  'cards-disease': cardsDiseaseParser,
  'hero-banner': heroBannerParser,
};

// PAGE TEMPLATE CONFIGURATION
const PAGE_TEMPLATE = {
  name: 'index-hk',
  description: 'AZ Health Club Hong Kong homepage with hero carousel, about section, and disease category cards',
  urls: [
    'https://azhealthclub.com.hk/'
  ],
  blocks: [
    {
      name: 'carousel-hero',
      instances: ['.homepage-slider-banner']
    },
    {
      name: 'columns-about',
      instances: ['.homepage_content']
    },
    {
      name: 'cards-disease',
      instances: ['.disease-grid.disease-page-cards']
    },
    {
      name: 'hero-banner',
      instances: ['.page-full-width-field']
    }
  ],
  sections: [
    {
      id: 'section-1',
      name: 'Hero Carousel',
      selector: '.homepage-slider-banner',
      style: null,
      blocks: ['carousel-hero'],
      defaultContent: []
    },
    {
      id: 'section-2',
      name: 'About Section',
      selector: '.homepage_content',
      style: null,
      blocks: ['columns-about'],
      defaultContent: []
    },
    {
      id: 'section-3',
      name: 'Disease Categories',
      selector: '.home-section-3',
      style: null,
      blocks: ['cards-disease'],
      defaultContent: ['.home-section-3 .section-title', '.home-section-3 .intro-text']
    },
    {
      id: 'section-4',
      name: 'Footer Banner',
      selector: '.page-full-width-field',
      style: null,
      blocks: ['hero-banner'],
      defaultContent: []
    }
  ]
};

// TRANSFORMER REGISTRY
const transformers = [
  azhealthclubCleanupTransformer,
  ...(PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [azhealthclubSectionsTransformer] : []),
];

/**
 * Execute all page transformers for a specific hook
 */
function executeTransformers(hookName, element, payload) {
  const enhancedPayload = {
    ...payload,
    template: PAGE_TEMPLATE
  };

  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

/**
 * Find all blocks on the page based on the embedded template configuration
 */
function findBlocksOnPage(document, template) {
  const pageBlocks = [];

  template.blocks.forEach(blockDef => {
    blockDef.instances.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) {
        console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
      }
      elements.forEach(element => {
        pageBlocks.push({
          name: blockDef.name,
          selector,
          element,
          section: blockDef.section || null
        });
      });
    });
  });

  console.log(`Found ${pageBlocks.length} block instances on page`);
  return pageBlocks;
}

export default {
  transform: (payload) => {
    const { document, url, html, params } = payload;
    const main = document.body;

    // 1. Execute beforeTransform transformers
    executeTransformers('beforeTransform', main, payload);

    // 2. Find blocks on page using embedded template
    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);

    // 3. Parse each block using registered parsers
    pageBlocks.forEach(block => {
      const parser = parsers[block.name];
      if (parser) {
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      } else {
        console.warn(`No parser found for block: ${block.name}`);
      }
    });

    // 4. Execute afterTransform transformers (section breaks)
    executeTransformers('afterTransform', main, payload);

    // 5. Apply WebImporter built-in rules
    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 6. Generate sanitized path
    const path = WebImporter.FileUtils.sanitizePath(
      new URL(params.originalURL).pathname.replace(/\/$/, '/index-hk').replace(/\.html$/, '')
    );

    return [{
      element: main,
      path,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        blocks: pageBlocks.map(b => b.name),
      }
    }];
  }
};
