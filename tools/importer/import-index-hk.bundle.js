/* eslint-disable */
var CustomImportScript = (() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // tools/importer/import-index-hk.js
  var import_index_hk_exports = {};
  __export(import_index_hk_exports, {
    default: () => import_index_hk_default
  });

  // tools/importer/parsers/carousel-hero.js
  function parse(element, { document }) {
    const slides = element.querySelectorAll(".carousel-item");
    const cells = [];
    slides.forEach((slide) => {
      const image = slide.querySelector('img.d-block, img.w-100, img[class*="d-block"]');
      const caption = slide.querySelector(".carousel-caption");
      const heading = caption ? caption.querySelector("h2.home-banner-title, h2, h1") : null;
      const description = caption ? caption.querySelector("p.lead, p") : null;
      const ctaLinks = caption ? Array.from(caption.querySelectorAll("a")) : [];
      const imageCell = [];
      if (image) {
        imageCell.push(image);
      }
      const contentCell = [];
      if (heading) contentCell.push(heading);
      if (description) contentCell.push(description);
      if (ctaLinks.length > 0) contentCell.push(...ctaLinks);
      if (imageCell.length > 0 || contentCell.length > 0) {
        cells.push([imageCell.length > 0 ? imageCell : "", contentCell.length > 0 ? contentCell : ""]);
      }
    });
    const block = WebImporter.Blocks.createBlock(document, { name: "carousel-hero", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/columns-about.js
  function parse2(element, { document }) {
    const desktopLayout = element.querySelector(".desktop-layout");
    if (!desktopLayout) return;
    const leftBox = desktopLayout.querySelector(".left-box");
    const leftContent = [];
    if (leftBox) {
      const heading = leftBox.querySelector('h1.green-title, h2.green-title, [class*="green-title"]');
      if (heading) leftContent.push(heading);
      const description = leftBox.querySelector("p.black-content");
      if (description) leftContent.push(description);
      const smallImages = leftBox.querySelectorAll(".small-images .small-images-item img, .small-images > img");
      if (smallImages.length > 0) {
        smallImages.forEach((img) => leftContent.push(img));
      }
    }
    const rightBox = desktopLayout.querySelector(".right-box");
    const rightContent = [];
    if (rightBox) {
      const bigImage = rightBox.querySelector(".big-image img, img");
      if (bigImage) rightContent.push(bigImage);
    }
    const cells = [
      [leftContent, rightContent]
    ];
    const block = WebImporter.Blocks.createBlock(document, { name: "columns-about", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-disease.js
  function parse3(element, { document }) {
    const diseaseBlocks = element.querySelectorAll(":scope > .disease-block");
    const cells = [];
    diseaseBlocks.forEach((block2) => {
      const anchor = block2.querySelector("a.disease-block-icon, a[href]");
      const img = block2.querySelector(".disease-graphic img, img");
      const heading = block2.querySelector("h2.disease-title, h2");
      const imageCell = [];
      if (img) {
        imageCell.push(img);
      }
      const textCell = [];
      if (heading && anchor) {
        const link = document.createElement("a");
        link.href = anchor.href;
        link.textContent = heading.textContent;
        const h2 = document.createElement("h2");
        h2.appendChild(link);
        textCell.push(h2);
      } else if (heading) {
        textCell.push(heading);
      }
      if (imageCell.length > 0 || textCell.length > 0) {
        cells.push([imageCell, textCell]);
      }
    });
    const block = WebImporter.Blocks.createBlock(document, { name: "cards-disease", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/hero-banner.js
  function parse4(element, { document }) {
    const img = element.querySelector('img.alignnone, img.size-full, img[class*="wp-image"], img');
    const cells = [];
    if (img) {
      cells.push([img]);
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "hero-banner", cells });
    element.replaceWith(block);
  }

  // tools/importer/transformers/azhealthclub-cleanup.js
  var TransformHook = { beforeTransform: "beforeTransform", afterTransform: "afterTransform" };
  function transform(hookName, element, payload) {
    if (hookName === TransformHook.beforeTransform) {
      WebImporter.DOMUtils.remove(element, [
        "#custom-link-popup",
        "#custom-popup-overlay"
      ]);
    }
    if (hookName === TransformHook.afterTransform) {
      WebImporter.DOMUtils.remove(element, [
        "header.wp-block-template-part",
        "footer.wp-block-template-part",
        "a.skip-link",
        ".featured-image"
      ]);
      WebImporter.DOMUtils.remove(element, [
        '[id^="batBeacon"]',
        "img.ywa-10000",
        "iframe",
        "noscript",
        "link"
      ]);
    }
  }

  // tools/importer/transformers/azhealthclub-sections.js
  var TransformHook2 = { beforeTransform: "beforeTransform", afterTransform: "afterTransform" };
  function transform2(hookName, element, payload) {
    if (hookName === TransformHook2.afterTransform) {
      const { template } = payload;
      if (!template || !template.sections || template.sections.length < 2) return;
      const document = element.ownerDocument;
      const sections = template.sections;
      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        const sectionEl = element.querySelector(section.selector);
        if (!sectionEl) continue;
        if (section.style) {
          const sectionMetadata = WebImporter.Blocks.createBlock(document, {
            name: "Section Metadata",
            cells: { style: section.style }
          });
          sectionEl.after(sectionMetadata);
        }
        if (i > 0) {
          const hr = document.createElement("hr");
          sectionEl.before(hr);
        }
      }
    }
  }

  // tools/importer/import-index-hk.js
  var parsers = {
    "carousel-hero": parse,
    "columns-about": parse2,
    "cards-disease": parse3,
    "hero-banner": parse4
  };
  var PAGE_TEMPLATE = {
    name: "index-hk",
    description: "AZ Health Club Hong Kong homepage with hero carousel, about section, and disease category cards",
    urls: [
      "https://azhealthclub.com.hk/"
    ],
    blocks: [
      {
        name: "carousel-hero",
        instances: [".homepage-slider-banner"]
      },
      {
        name: "columns-about",
        instances: [".homepage_content"]
      },
      {
        name: "cards-disease",
        instances: [".disease-grid.disease-page-cards"]
      },
      {
        name: "hero-banner",
        instances: [".page-full-width-field"]
      }
    ],
    sections: [
      {
        id: "section-1",
        name: "Hero Carousel",
        selector: ".homepage-slider-banner",
        style: null,
        blocks: ["carousel-hero"],
        defaultContent: []
      },
      {
        id: "section-2",
        name: "About Section",
        selector: ".homepage_content",
        style: null,
        blocks: ["columns-about"],
        defaultContent: []
      },
      {
        id: "section-3",
        name: "Disease Categories",
        selector: ".home-section-3",
        style: null,
        blocks: ["cards-disease"],
        defaultContent: [".home-section-3 .section-title", ".home-section-3 .intro-text"]
      },
      {
        id: "section-4",
        name: "Footer Banner",
        selector: ".page-full-width-field",
        style: null,
        blocks: ["hero-banner"],
        defaultContent: []
      }
    ]
  };
  var transformers = [
    transform,
    ...PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [transform2] : []
  ];
  function executeTransformers(hookName, element, payload) {
    const enhancedPayload = __spreadProps(__spreadValues({}, payload), {
      template: PAGE_TEMPLATE
    });
    transformers.forEach((transformerFn) => {
      try {
        transformerFn.call(null, hookName, element, enhancedPayload);
      } catch (e) {
        console.error(`Transformer failed at ${hookName}:`, e);
      }
    });
  }
  function findBlocksOnPage(document, template) {
    const pageBlocks = [];
    template.blocks.forEach((blockDef) => {
      blockDef.instances.forEach((selector) => {
        const elements = document.querySelectorAll(selector);
        if (elements.length === 0) {
          console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
        }
        elements.forEach((element) => {
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
  var import_index_hk_default = {
    transform: (payload) => {
      const { document, url, html, params } = payload;
      const main = document.body;
      executeTransformers("beforeTransform", main, payload);
      const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);
      pageBlocks.forEach((block) => {
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
      executeTransformers("afterTransform", main, payload);
      const hr = document.createElement("hr");
      main.appendChild(hr);
      WebImporter.rules.createMetadata(main, document);
      WebImporter.rules.transformBackgroundImages(main, document);
      WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
      const path = WebImporter.FileUtils.sanitizePath(
        new URL(params.originalURL).pathname.replace(/\/$/, "/index-hk").replace(/\.html$/, "")
      );
      return [{
        element: main,
        path,
        report: {
          title: document.title,
          template: PAGE_TEMPLATE.name,
          blocks: pageBlocks.map((b) => b.name)
        }
      }];
    }
  };
  return __toCommonJS(import_index_hk_exports);
})();
