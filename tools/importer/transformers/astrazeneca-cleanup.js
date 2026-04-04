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
  }
}
