export default function decorate(block) {
  const table = document.createElement('table');
  const rows = [...block.children];

  rows.forEach((row, rowIndex) => {
    const cols = [...row.children];
    const tr = document.createElement('tr');

    cols.forEach((col) => {
      const cell = document.createElement(rowIndex === 0 ? 'th' : 'td');
      cell.innerHTML = col.innerHTML;
      tr.appendChild(cell);
    });

    if (rowIndex === 0) {
      const thead = table.querySelector('thead') || document.createElement('thead');
      thead.appendChild(tr);
      if (!table.querySelector('thead')) table.appendChild(thead);
    } else {
      let tbody = table.querySelector('tbody');
      if (!tbody) {
        tbody = document.createElement('tbody');
        table.appendChild(tbody);
      }
      tbody.appendChild(tr);
    }
  });

  block.innerHTML = '';
  block.appendChild(table);
}
