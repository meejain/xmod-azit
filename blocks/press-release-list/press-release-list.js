const MONTHS_IT = {
  gennaio: 0,
  febbraio: 1,
  marzo: 2,
  aprile: 3,
  maggio: 4,
  giugno: 5,
  luglio: 6,
  agosto: 7,
  settembre: 8,
  ottobre: 9,
  novembre: 10,
  dicembre: 11,
};

function parseItalianDate(dateStr) {
  if (!dateStr) return 0;
  const parts = dateStr.trim().split(/\s+/);
  if (parts.length < 3) return 0;
  const day = parseInt(parts[0], 10);
  const month = MONTHS_IT[parts[1].toLowerCase()];
  const year = parseInt(parts[2], 10);
  if (Number.isNaN(day) || month === undefined || Number.isNaN(year)) return 0;
  return new Date(year, month, day).getTime();
}

function getYear(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.trim().split(/\s+/);
  return parts.length >= 3 ? parts[2] : null;
}

async function fetchAllPages(url) {
  const allData = [];
  let offset = 0;
  const limit = 500;
  let hasMore = true;

  while (hasMore) {
    const separator = url.includes('?') ? '&' : '?';
    // eslint-disable-next-line no-await-in-loop
    const resp = await fetch(`${url}${separator}offset=${offset}&limit=${limit}`);
    if (!resp.ok) break;
    // eslint-disable-next-line no-await-in-loop
    const json = await resp.json();
    const data = json.data || [];
    allData.push(...data);
    hasMore = data.length === limit;
    offset += limit;
  }
  return allData;
}

async function fetchPressReleases() {
  const indexUrl = '/area-stampa/press-releases/press-release-index.json';
  const items = await fetchAllPages(indexUrl);
  if (items.length > 0) return items;

  const fallback = await fetchAllPages('/query-index.json');
  return fallback.filter((item) => item.template === 'press-release');
}

function renderCards(items, container) {
  items.forEach((item) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = item.path;
    a.innerHTML = `
      <p class="card-title">${item.title}</p>
      <p class="card-date">${item['published-date'] || ''}</p>
    `;
    li.append(a);
    container.append(li);
  });
}

export default async function decorate(block) {
  const config = {};
  [...block.children].forEach((row) => {
    const key = row.children[0]?.textContent?.trim().toLowerCase();
    const val = row.children[1]?.textContent?.trim();
    if (key && val) config[key] = val;
  });

  const pageSize = parseInt(config['page-size'] || '6', 10);
  const heading = config.heading || 'Comunicati stampa';

  block.textContent = '';

  /* --- Filter bar (heading only, hidden on live site) --- */
  const filterBar = document.createElement('div');
  filterBar.className = 'filter-bar';
  filterBar.innerHTML = `<h3>${heading}</h3>`;
  block.append(filterBar);

  /* --- Toggle row (right-aligned Più/Meno filtri) --- */
  const toggleRow = document.createElement('div');
  toggleRow.className = 'filter-toggle-row';
  toggleRow.innerHTML = `
    <button class="filter-toggle" aria-expanded="false" aria-controls="chip-panel">Più filtri</button>
  `;
  block.append(toggleRow);

  /* --- Chip panel (hidden) --- */
  const chipPanel = document.createElement('div');
  chipPanel.className = 'chip-panel';
  chipPanel.id = 'chip-panel';
  chipPanel.innerHTML = `
    <div class="chip-panel-inner">
      <h4 class="chip-panel-label">Anni disponibili</h4>
      <div class="chip-list" role="group" aria-label="Filtra per anno"></div>
    </div>
  `;
  block.append(chipPanel);

  /* --- Selected filters display --- */
  const selectedDisplay = document.createElement('div');
  selectedDisplay.className = 'selected-filters';
  block.append(selectedDisplay);

  /* --- Results --- */
  const resultsSection = document.createElement('div');
  resultsSection.className = 'results';
  resultsSection.innerHTML = `
    <h3 class="results-label">Più recenti</h3>
    <ul class="results-list"></ul>
  `;
  block.append(resultsSection);

  const loadingEl = document.createElement('div');
  loadingEl.className = 'loading';
  loadingEl.textContent = 'Caricamento...';
  resultsSection.append(loadingEl);

  /* --- Fetch data --- */
  const allItems = await fetchPressReleases();
  loadingEl.remove();

  if (allItems.length === 0) {
    const noResults = document.createElement('div');
    noResults.className = 'no-results';
    noResults.textContent = 'Nessun comunicato stampa trovato.';
    resultsSection.append(noResults);
    return;
  }

  allItems.sort((a, b) => parseItalianDate(b['published-date']) - parseItalianDate(a['published-date']));

  /* --- Build year chips --- */
  const years = [...new Set(
    allItems.map((item) => getYear(item['published-date'])).filter(Boolean),
  )].sort((a, b) => b - a);

  const chipList = chipPanel.querySelector('.chip-list');
  const toggleBtn = toggleRow.querySelector('.filter-toggle');

  years.forEach((year) => {
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.textContent = year;
    chip.dataset.year = year;
    chipList.append(chip);
  });

  /* --- Toggle filter panel --- */
  toggleBtn.addEventListener('click', () => {
    const isOpen = chipPanel.classList.toggle('open');
    toggleBtn.classList.toggle('open', isOpen);
    toggleBtn.setAttribute('aria-expanded', isOpen);
    toggleBtn.textContent = isOpen ? 'Meno filtri' : 'Più filtri';
  });

  /* --- State --- */
  const resultsList = resultsSection.querySelector('.results-list');
  const resultsLabel = resultsSection.querySelector('.results-label');
  let visibleCount = pageSize;
  let filteredItems = allItems;
  const activeYears = new Set();

  /* --- Filter logic --- */
  function applyFilter() {
    if (activeYears.size === 0) {
      filteredItems = allItems;
      resultsLabel.textContent = 'Più recenti';
      resultsLabel.style.display = '';
    } else {
      filteredItems = allItems.filter((item) => activeYears.has(getYear(item['published-date'])));
      resultsLabel.style.display = 'none';
    }
    visibleCount = pageSize;
  }

  /* --- Render cards + load more --- */
  function render() {
    resultsList.innerHTML = '';
    const toShow = filteredItems.slice(0, visibleCount);
    renderCards(toShow, resultsList);

    const existing = block.querySelector('.load-more');
    if (existing) existing.remove();

    if (visibleCount < filteredItems.length) {
      const loadMore = document.createElement('button');
      loadMore.className = 'load-more';
      loadMore.textContent = 'Mostra di più';
      loadMore.addEventListener('click', () => {
        visibleCount += pageSize;
        render();
      });
      resultsSection.append(loadMore);
    }
  }

  /* --- Update selected filters display --- */
  function updateSelectedDisplay() {
    selectedDisplay.innerHTML = '';
    if (activeYears.size === 0) return;

    const countLabel = document.createElement('h3');
    countLabel.className = 'selected-filters-label';
    countLabel.textContent = `${filteredItems.length} Risultati che contengono:`;
    selectedDisplay.append(countLabel);

    const tagList = document.createElement('div');
    tagList.className = 'selected-tags';
    activeYears.forEach((year) => {
      const tag = document.createElement('button');
      tag.className = 'selected-tag';
      tag.innerHTML = `${year} <span class="selected-tag-x">×</span>`;
      tag.addEventListener('click', () => {
        activeYears.delete(year);
        const chipInPanel = chipList.querySelector(`.chip[data-year="${year}"]`);
        if (chipInPanel) chipInPanel.classList.remove('active');
        applyFilter();
        updateSelectedDisplay();
        render();
      });
      tagList.append(tag);
    });
    selectedDisplay.append(tagList);
  }

  /* --- Chip click handler (multi-select) --- */
  chipList.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;

    const { year } = chip.dataset;

    if (activeYears.has(year)) {
      activeYears.delete(year);
      chip.classList.remove('active');
    } else {
      activeYears.add(year);
      chip.classList.add('active');
    }
    applyFilter();
    updateSelectedDisplay();
    render();
  });

  render();
}
