export default function decorate(block) {
  // Find the link inside the block
  const link = block.querySelector('a');
  if (!link) return;

  const href = link.getAttribute('href');

  // Make the entire block act as a clickable link
  // Wrap all block content inside an anchor element
  const wrapper = document.createElement('a');
  wrapper.setAttribute('href', href);
  wrapper.classList.add('download-press-link');

  // Move all children into the anchor
  while (block.firstChild) {
    wrapper.appendChild(block.firstChild);
  }
  block.appendChild(wrapper);

  // Remove the original nested link to avoid link-in-link
  const nestedLink = wrapper.querySelector('a:not(.download-press-link)');
  if (nestedLink) {
    const span = document.createElement('span');
    span.textContent = nestedLink.textContent;
    nestedLink.replaceWith(span);
  }
}
