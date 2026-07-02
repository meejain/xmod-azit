# Full Inventory Crawl (in-browser BFS, throttled, session-authenticated)
# Method: fetch() inside browser context, follows all static internal <a href> links until queue empty.
# Limitation: captures statically-linked pages only; JS "load more"/infinite-scroll archives may hold more.
# Columns: site | crawledPages | notes

agencia.petrobras.com.br | 119 | 108 pt + 11 en locale; original catalog had 56 (SAMPLE — undercounted)
nossaenergia.petrobras.com.br | 194 | 183 articles + 11 nav; original catalog had 44 (SAMPLE — undercounted). Note: /categorias filter is JS; count from article cross-links, likely near-complete.
sustentabilidade.petrobras.com.br | ~60 | Static crawl only reached 9 (chapters are JS-carousel + mixed-content CSP blocks fetch). Original catalog of 60 (chapters enumerated from carousel DOM across report years) is the more complete figure. VERIFIED as near-complete.
comunicabaciadesantos.petrobras.com.br | 134 | 161 raw paths minus ~27 /web/comunica-bacia-de-santos/ mirror duplicates = ~134 unique content pages (condicionantes, empreendimentos, monitoramento, FPSO, PEA trees + 13 news). Original catalog had 23 (SAMPLE — heavily undercounted).
comunicaespiritosanto.petrobras.com.br | 68 | 68 unique content pages (empreendimentos, condicionantes, monitoramento, FPSO, PEA trees + 15 news). Original catalog had 26 (SAMPLE — undercounted).
petrobras.com.br | 249 (136 pt + 113 en) | FULL SITE both locales catalogued. PT+EN pages with same layout co-grouped into shared templates (27 total). 249 screenshots, 100% coverage, 238 block variants. Was 88 (sample, PT-only).
transparencia.petrobras.com.br | 52 | Crawl found 52, original catalog 51 (off-by-one /home alias). ACCURATE — no undercount.
canalfornecedor.petrobras.com.br | 59 | Crawl found 59, original catalog 54. Minor undercount (~5 pages: lives/eventos detail). NEAR-ACCURATE.
precos.petrobras.com.br | 4 | Crawl found 4 (+/home alias), matches original catalog of 4. ACCURATE.
pbio.com.br | 61 | Crawl 61, catalog 60 (off-by-one). ACCURATE.
pblogsa.com.br | 61 | Crawl 61, catalog 60 (off-by-one). ACCURATE.
pben.com.br | 61 | Crawl 61, catalog 60 (off-by-one). ACCURATE.
termoba.com.br | 61 | Crawl 61, catalog 60 (off-by-one). ACCURATE.
termomacae.com.br | 63 | Crawl 63, catalog 60. NEAR-ACCURATE (+3).
baixadasantistaenergia.com.br | 61 | Crawl 61, catalog 60 (off-by-one). ACCURATE.
araucarianitrogenados.com.br | 61 | Crawl 61, catalog 60 (off-by-one). ACCURATE.
