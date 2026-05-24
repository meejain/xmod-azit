/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: AZ Health Club cleanup.
 * Removes non-authorable site chrome, popups, and tracking elements.
 * Selectors validated against captured DOM (migration-work/cleaned.html).
 */
const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.beforeTransform) {
    // Remove popups/overlays that may interfere with block parsing
    // Found in captured HTML: <div id="custom-link-popup"> (line 321)
    // Found in captured HTML: <div id="custom-popup-overlay"> (line 335)
    WebImporter.DOMUtils.remove(element, [
      '#custom-link-popup',
      '#custom-popup-overlay',
    ]);
  }

  if (hookName === TransformHook.afterTransform) {
    // Remove non-authorable site chrome
    // Found in captured HTML: <header class="wp-block-template-part"> (line 6)
    // Found in captured HTML: <footer class="wp-block-template-part"> (line 254)
    // Found in captured HTML: <a class="skip-link screen-reader-text"> (line 4)
    // Found in captured HTML: <div class="featured-image ..."> (line 52) - empty container
    WebImporter.DOMUtils.remove(element, [
      'header.wp-block-template-part',
      'footer.wp-block-template-part',
      'a.skip-link',
      '.featured-image',
    ]);

    // Remove tracking pixels and beacons
    // Found in captured HTML: <div id="batBeacon878030153927"> (line 342) - Bing tracking
    // Found in captured HTML: <img class="ywa-10000"> (lines 345, 348) - Yahoo analytics
    // Found in captured HTML: <iframe> (line 346) - DoubleClick tracking
    WebImporter.DOMUtils.remove(element, [
      '[id^="batBeacon"]',
      'img.ywa-10000',
      'iframe',
      'noscript',
      'link',
    ]);
  }
}
