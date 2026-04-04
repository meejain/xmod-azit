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

  // tools/importer/import-press-release.js
  var import_press_release_exports = {};
  __export(import_press_release_exports, {
    default: () => import_press_release_default
  });

  // tools/importer/parsers/hero-press.js
  function parse(element, { document }) {
    const heading = element.querySelector('h1, h2, .hero-feature__header, [class*="header"]');
    const contentCell = [];
    if (heading) {
      const h1 = document.createElement("h1");
      h1.textContent = heading.textContent.trim();
      contentCell.push(h1);
    }
    const cells = [contentCell];
    const block = WebImporter.Blocks.createBlock(document, { name: "hero-press", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/download-press.js
  function parse2(element, { document }) {
    const icon = element.querySelector('img.download-lockup__image, img[class*="lockup"], img');
    const linkEl = element.closest("a") || element.querySelector("a");
    const href = linkEl ? linkEl.getAttribute("href") : "";
    let titleText = "";
    const titleP = element.querySelector(".download-lockup__title");
    if (titleP) {
      const spans = titleP.querySelectorAll(":scope > span:not(.download-lockup__size)");
      if (spans.length > 0) {
        titleText = spans[0].textContent.trim();
      } else {
        titleText = titleP.firstChild ? titleP.firstChild.textContent.trim() : titleP.textContent.trim();
      }
    }
    if (!titleText) {
      titleText = "Download";
    }
    const sizeSpan = element.querySelector('.download-lockup__size, [class*="size"]');
    const sizeText = sizeSpan ? sizeSpan.textContent.trim() : "";
    const wrapper = document.createElement("div");
    const link = document.createElement("a");
    link.setAttribute("href", href);
    link.textContent = titleText;
    wrapper.append(link);
    if (sizeText) {
      const sizeEl = document.createElement("p");
      sizeEl.textContent = sizeText;
      wrapper.append(sizeEl);
    }
    const cells = [];
    if (icon) {
      cells.push([icon, wrapper]);
    } else {
      cells.push([wrapper]);
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "download-press", cells });
    element.replaceWith(block);
  }

  // tools/importer/transformers/astrazeneca-cleanup.js
  var H = { before: "beforeTransform", after: "afterTransform" };
  function transform(hookName, element, payload) {
    if (hookName === H.before) {
      WebImporter.DOMUtils.remove(element, [
        "#CookieReportsPanel",
        "#CookieReportsBannerAZ",
        "#CookieReportsOverlay",
        "section.modal-window",
        "#modal-link-confirmation"
      ]);
    }
    if (hookName === H.after) {
      WebImporter.DOMUtils.remove(element, [
        "nav.navigation",
        ".nav.mainnav",
        "footer.footer",
        ".footer-component",
        "ul#skip-shortcuts",
        "#udo-object-server",
        "#udo-object",
        ".morePar.parsys",
        "iframe",
        "link",
        "noscript"
      ]);
      element.querySelectorAll("*").forEach((el) => {
        el.removeAttribute("data-ds-url");
        el.removeAttribute("onclick");
        el.removeAttribute("data-track");
      });
    }
  }

  // tools/importer/transformers/astrazeneca-sections.js
  function transform2(hookName, element, payload) {
    if (hookName === "afterTransform") {
      const { document } = payload;
      const sections = payload.template && payload.template.sections;
      if (!sections || sections.length < 2) return;
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
      for (let i = sectionElements.length - 1; i >= 0; i--) {
        const { section, el } = sectionElements[i];
        if (section.style) {
          const metaBlock = WebImporter.Blocks.createBlock(document, {
            name: "Section Metadata",
            cells: { style: section.style }
          });
          el.append(metaBlock);
        }
        if (i > 0) {
          const hr = document.createElement("hr");
          el.parentNode.insertBefore(hr, el);
        }
      }
    }
  }

  // tools/importer/import-press-release.js
  var parsers = {
    "hero-press": parse,
    "download-press": parse2
  };
  var PAGE_TEMPLATE = {
    name: "press-release",
    description: "AstraZeneca press release page with hero title, publication metadata, PDF download, and article body",
    urls: [
      "https://www.astrazeneca.it/area-stampa/press-releases/2016/CAZ-AVI-CHMP.html"
    ],
    blocks: [
      {
        name: "hero-press",
        instances: [".hero-feature--no-background"]
      },
      {
        name: "download-press",
        instances: [".download-lockup"]
      }
    ],
    sections: [
      {
        id: "section-1",
        name: "Hero Section",
        selector: ".heroFeature",
        style: null,
        blocks: ["hero-press"],
        defaultContent: []
      },
      {
        id: "section-2",
        name: "Article Body Section",
        selector: ".pt-article__body",
        style: null,
        blocks: ["download-press"],
        defaultContent: [".publishedDate", ".rich-text"]
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
  var import_press_release_default = {
    transform: (payload) => {
      const { document, url, params } = payload;
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
        new URL(params.originalURL).pathname.replace(/\/$/, "").replace(/\.html$/, "")
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
  return __toCommonJS(import_press_release_exports);
})();
