export default function decorate(block) {
  const picture = block.querySelector('picture');
  if (picture) {
    const pictureParent = picture.closest('div');
    block.prepend(picture);
    if (pictureParent && !pictureParent.textContent.trim() && !pictureParent.querySelector('picture')) {
      pictureParent.remove();
    }
  }

  // For two-cell layout (image cell + text cell), unwrap the text cell
  const row = block.querySelector(':scope > div');
  if (row) {
    const textCell = row.querySelector(':scope > div');
    if (textCell) {
      while (textCell.firstChild) row.appendChild(textCell.firstChild);
      textCell.remove();
    }
  }
}
