export default function decorate(block) {
  const rows = [...block.children];
  rows.forEach((row) => {
    const cells = [...row.children];
    row.classList.add('teaser-nav-card');

    // First cell = image
    if (cells[0]) {
      cells[0].classList.add('teaser-nav-image');
      const img = cells[0].querySelector('img');
      if (img) {
        img.loading = 'lazy';
      }
    }

    // Second cell = content (title + CTA)
    if (cells[1]) {
      cells[1].classList.add('teaser-nav-content');
    }

    // Make entire card clickable
    const link = row.querySelector('a');
    if (link) {
      row.style.cursor = 'pointer';
      row.addEventListener('click', (e) => {
        if (e.target.tagName !== 'A') {
          link.click();
        }
      });
    }
  });
}
