/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: AstraZeneca IT site cleanup.
 * Selectors from captured DOM of www.astrazeneca.it press release pages.
 */
const H = { before: 'beforeTransform', after: 'afterTransform' };

export default function transform(hookName, element, payload) {
  if (hookName === H.before) {
    // Remove cookie/modal overlays that may interfere with block parsing
    // Found in captured HTML: <section class="modal-window modal-window--show js-modal-window--show">
    // Found in captured HTML: <div id="CookieReportsPanel">
    // Found in captured HTML: <section class="modal-window modal-window--show js-modal-window--show">
    WebImporter.DOMUtils.remove(element, [
      '#CookieReportsPanel',
      '#CookieReportsBannerAZ',
      '#CookieReportsOverlay',
      'section.modal-window',
      '#modal-link-confirmation',
    ]);

    // Fix broken download-lockup icons on 2021/2022/2026 pages
    // These pages use bianco.jpg (white placeholder) or an unrelated SVG instead of the AZ circle icon
    const GOOD_ICON_SRC = '/content/dam/az-cn/cq5dam.web.134x132.Icon%20phase%203.png/jcr:content/renditions/cq5dam.web.100.square.cq5dam.web.134x132.Icon%20phase%203.png';
    element.querySelectorAll('.download-lockup__image').forEach((img) => {
      const src = img.getAttribute('src') || '';
      if (src.includes('bianco.jpg') || src.includes('intelligentcontent') || !src.includes('Icon%20phase')) {
        img.setAttribute('src', GOOD_ICON_SRC);
      }
    });

    // Convert simple "Scarica il comunicato stampa" text links into download-lockup structure
    // MUST run in beforeTransform so the download-press parser can find .download-lockup
    // 2017/2018 pages use a plain <a> link instead of the .download-lockup component
    const { document } = payload;
    const simpleDownloadLinks = element.querySelectorAll('a[href*="/content/dam/"][href*=".pdf"]');
    simpleDownloadLinks.forEach((a) => {
      if (a.closest('.download-lockup') || a.classList.contains('download-lockup')) return;
      const text = a.textContent.trim();
      if (!text.toLowerCase().includes('scarica')) return;

      const lockupDiv = document.createElement('div');
      lockupDiv.className = 'lockup section';
      const lockupA = document.createElement('a');
      lockupA.className = 'download-lockup';
      lockupA.setAttribute('href', a.getAttribute('href'));

      const img = document.createElement('img');
      img.src = 'https://www.astrazeneca.it/content/dam/az-cn/cq5dam.web.134x132.Icon%20phase%203.png/jcr:content/renditions/cq5dam.web.100.square.cq5dam.web.134x132.Icon%20phase%203.png';
      img.alt = 'AZ';
      img.className = 'download-lockup__image img-circle';
      lockupA.appendChild(img);

      const wrapper = document.createElement('div');
      wrapper.className = 'download-lockup__wrapper';
      const titleP = document.createElement('p');
      titleP.className = 'download-lockup__title';
      const titleSpan = document.createElement('span');
      titleSpan.textContent = 'Scarica il comunicato stampa';
      titleP.appendChild(titleSpan);
      const sizeSpan = document.createElement('span');
      sizeSpan.className = 'download-lockup__size';
      sizeSpan.textContent = 'PDF';
      titleP.appendChild(sizeSpan);
      wrapper.appendChild(titleP);
      lockupA.appendChild(wrapper);

      const iconSpan = document.createElement('span');
      iconSpan.className = 'download-lockup__icon';
      lockupA.appendChild(iconSpan);

      lockupDiv.appendChild(lockupA);
      a.parentElement.replaceChild(lockupDiv, a);
    });
  }

  if (hookName === H.after) {
    // Remove non-authorable site chrome
    // Found in captured HTML: <nav class="navigation js-navigation">
    // Found in captured HTML: <footer class="footer" id="footer">
    // Found in captured HTML: <ul class="shortcuts" id="skip-shortcuts">
    // Found in captured HTML: <div id="udo-object-server">, <div id="udo-object">
    // Found in captured HTML: <div class="container"><div class="morePar parsys"></div></div>
    WebImporter.DOMUtils.remove(element, [
      'nav.navigation',
      '.nav.mainnav',
      'footer.footer',
      '.footer-component',
      'ul#skip-shortcuts',
      '#udo-object-server',
      '#udo-object',
      '.morePar.parsys',
      'iframe',
      'link',
      'noscript',
    ]);

    // Clean tracking attributes
    element.querySelectorAll('*').forEach((el) => {
      el.removeAttribute('data-ds-url');
      el.removeAttribute('onclick');
      el.removeAttribute('data-track');
    });

    // Split date into two separate paragraphs for proper styling
    // Source HTML: <time><span class="date__title">Pubblicato</span><span class="date__date">6 maggio 2016</span></time>
    const dateRegion = element.querySelector('.date__date-region, time.date__date-region');
    if (dateRegion) {
      const { document } = payload;
      const titleSpan = dateRegion.querySelector('.date__title');
      const dateSpan = dateRegion.querySelector('.date__date');
      if (titleSpan && dateSpan) {
        const p1 = document.createElement('p');
        p1.textContent = titleSpan.textContent.trim();
        const p2 = document.createElement('p');
        p2.textContent = dateSpan.textContent.trim();
        const parent = dateRegion.parentElement;
        parent.insertBefore(p1, dateRegion);
        parent.insertBefore(p2, dateRegion);
        dateRegion.remove();
      }
    }

    // Convert relative PDF links to absolute AEM live URLs
    // EDS strips .pdf extension from relative paths, so use absolute to preserve it
    element.querySelectorAll('a[href*=".pdf"]').forEach((a) => {
      const href = a.getAttribute('href');
      if (href && href.startsWith('/content/dam/')) {
        const cleanPath = href.toLowerCase().replace(/\.pdf$/, '.pdf');
        a.setAttribute('href', `https://main--xmod-azit--meejain.aem.live${cleanPath}`);
      }
    });
  }
}
