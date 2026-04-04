/* eslint-disable */
/* global WebImporter */

/**
 * Parser for download-press variant.
 * Base block: download (custom block, 1 row with 2 columns: icon + content)
 * Source: https://www.astrazeneca.it/area-stampa/press-releases/2016/CAZ-AVI-CHMP.html
 * Source HTML: a.download-lockup with img.download-lockup__image + .download-lockup__wrapper
 */
export default function parse(element, { document }) {
  // Extract icon image
  // Found in captured HTML: <img class="download-lockup__image img-circle" src="..." alt="AZ">
  const icon = element.querySelector('img.download-lockup__image, img[class*="lockup"], img');

  // Extract download link href
  // Found in captured HTML: <a class="download-lockup" href="/content/dam/az-it/downloads/CAZ-AVI-CHMP.pdf">
  const linkEl = element.closest('a') || element.querySelector('a');
  const href = linkEl ? linkEl.getAttribute('href') : '';

  // Extract title text - try multiple approaches for robustness
  // Found in captured HTML: <p class="download-lockup__title"><span>Scarica il comunicato stampa</span>...
  let titleText = '';
  const titleP = element.querySelector('.download-lockup__title');
  if (titleP) {
    // Get first span text (title), excluding the size span
    const spans = titleP.querySelectorAll(':scope > span:not(.download-lockup__size)');
    if (spans.length > 0) {
      titleText = spans[0].textContent.trim();
    } else {
      // Fallback: get direct text content of the title element
      titleText = titleP.firstChild ? titleP.firstChild.textContent.trim() : titleP.textContent.trim();
    }
  }
  if (!titleText) {
    titleText = 'Download';
  }

  // Extract file size
  // Found in captured HTML: <span class="download-lockup__size">PDF 131KB</span>
  const sizeSpan = element.querySelector('.download-lockup__size, [class*="size"]');
  const sizeText = sizeSpan ? sizeSpan.textContent.trim() : '';

  // Build content cell: a container div with link and file size
  const wrapper = document.createElement('div');
  const link = document.createElement('a');
  link.setAttribute('href', href);
  link.textContent = titleText;
  wrapper.append(link);

  if (sizeText) {
    const sizeEl = document.createElement('p');
    sizeEl.textContent = sizeText;
    wrapper.append(sizeEl);
  }

  // Download block structure: 1 row with 2 columns [icon, content]
  const cells = [];
  if (icon) {
    cells.push([icon, wrapper]);
  } else {
    cells.push([wrapper]);
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'download-press', cells });
  element.replaceWith(block);
}
