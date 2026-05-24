export default function decorate(block) {
  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-about-${cols.length}-cols`);

  [...block.children].forEach((row) => {
    [...row.children].forEach((col) => {
      const pic = col.querySelector('picture');
      if (pic) {
        const picWrapper = pic.closest('div');
        if (picWrapper && picWrapper.children.length === 1) {
          picWrapper.classList.add('columns-about-img-col');
        }
      }
    });
  });

  // Make image-only paragraphs in left column display inline
  const leftCol = block.querySelector(':scope > div > div:first-child');
  if (leftCol) {
    [...leftCol.querySelectorAll(':scope > p')].forEach((p) => {
      if (p.querySelector('picture') && !p.textContent.trim()) {
        p.classList.add('columns-about-icon');
      }
    });
  }
}
