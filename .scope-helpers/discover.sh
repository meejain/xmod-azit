#!/bin/bash
# Consolidate fingerprints + run template discovery, then print template structures for naming.
set -e
CATALOG_FOLDER="${1:-/workspace/catalog}"
CONFIG_PATH="${CATALOG_FOLDER}/.catalog-config.json"
PLUGIN_ROOT=$(jq -r '.pluginRoot' "$CONFIG_PATH")
FP=$(node "${PLUGIN_ROOT}/skills/excat-catalog-pages/scripts/consolidate-fingerprints.js" "$CATALOG_FOLDER")
echo "Fingerprints: $FP"
( cd "${PLUGIN_ROOT}/tools/excatops-mcp/clustering" && python3 -m cluster.template_pages --config "${CONFIG_PATH}" >/dev/null 2>>"${CATALOG_FOLDER}/catalog.log" )
echo "=== TEMPLATE STRUCTURES (name them) ==="
cd "$CATALOG_FOLDER"
declare -A MAP
while IFS= read -r f; do u=$(jq -r '.url' "$f"); MAP["$u"]="$f"; done < <(find .pages -name page-catalog.json)
jq -r '.templates[] | "\(.name)\t\(.urls|length)\t\(.representativePages[0])"' .template-catalog-scoped.json | while IFS=$'\t' read -r name cnt rep; do
  f="${MAP[$rep]}"
  seq=$([ -n "$f" ] && jq -r '[.blocks[].type] | join(" > ")' "$f" || echo "(none)")
  echo "$name [$cnt]  $rep"
  echo "   $seq"
done
