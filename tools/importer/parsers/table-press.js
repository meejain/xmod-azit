/* eslint-disable */
/* global WebImporter */

/**
 * Parser for table-press variant.
 * Base block: table
 * Converts HTML <table> elements into EDS table block format.
 * Source: press release pages with clinical trial data tables.
 */
export default function parse(element, { document }) {
  const rows = element.querySelectorAll('tr');
  if (!rows || rows.length === 0) return;

  const cells = [];

  rows.forEach((row, rowIndex) => {
    const rowCells = row.querySelectorAll('th, td');
    const cellContents = [];

    rowCells.forEach((cell) => {
      // Clone cell content to preserve HTML structure
      const container = document.createElement('div');
      container.innerHTML = cell.innerHTML;
      cellContents.push(container);
    });

    if (cellContents.length > 0) {
      cells.push(cellContents);
    }
  });

  if (cells.length === 0) return;

  const block = WebImporter.Blocks.createBlock(document, { name: 'table-press', cells });
  element.replaceWith(block);
}
