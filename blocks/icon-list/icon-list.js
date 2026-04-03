export default function decorate(block) {
  const rows = [...block.children];
  rows.forEach((row) => {
    row.classList.add('icon-list-item');
    const cells = [...row.children];

    // First cell = icon image
    if (cells[0]) {
      cells[0].classList.add('icon-list-icon');
    }

    // Second cell = label text
    if (cells[1]) {
      cells[1].classList.add('icon-list-label');
    }

    // Make entire item clickable
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
