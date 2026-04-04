export default function decorate(block) {
  // Move the picture out of the content wrapper to be a direct child of .hero
  // This allows it to be positioned absolute relative to .hero, not the content div
  const picture = block.querySelector('picture');
  if (picture) {
    const pictureParent = picture.closest('p') || picture.parentElement;
    // Move picture to be first child of the block
    block.prepend(picture);
    // Remove the empty <p> left behind
    if (pictureParent && pictureParent.tagName === 'P' && !pictureParent.textContent.trim()) {
      pictureParent.remove();
    }
  }
}
