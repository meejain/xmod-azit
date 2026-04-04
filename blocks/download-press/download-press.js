export default function decorate(block) {
  const rows = [...block.children];
  rows.forEach((row) => {
    const cols = [...row.children];
    if (cols.length >= 2) {
      const iconCol = cols[0];
      const contentCol = cols[1];
      iconCol.classList.add('download-press-icon');
      contentCol.classList.add('download-press-content');
    }
  });
}
