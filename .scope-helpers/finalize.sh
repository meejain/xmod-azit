#!/bin/bash
# Validate decisions, trim representativePages to 5, apply tuning, validate catalog, block rollup, summary.
set -e
CATALOG_FOLDER="${1:-/workspace/catalog}"
CONFIG_PATH="${CATALOG_FOLDER}/.catalog-config.json"
PLUGIN_ROOT=$(jq -r '.pluginRoot' "$CONFIG_PATH")
LOG_FILE="${CATALOG_FOLDER}/catalog.log"
VALIDATE_SCRIPT="${PLUGIN_ROOT}/tools/excatops-mcp/src/utils/validate-json-schema.js"
SKILL_DIR="${PLUGIN_ROOT}/skills/excat-catalog-pages"
SITE_CATALOG_SKILL="${PLUGIN_ROOT}/skills/excat-site-catalog"
APPLY_TUNING_SCRIPT="${PLUGIN_ROOT}/tools/excatops-mcp/clustering/cluster/apply_tuning.py"

node "$VALIDATE_SCRIPT" "${CATALOG_FOLDER}/.decisions.json" "${SKILL_DIR}/schemas/tuning-decisions.schema.json" --logFile "$LOG_FILE"

# Trim representativePages to max 5 (schema cap)
node -e "
const fs=require('fs');
const f='${CATALOG_FOLDER}/.template-catalog-scoped.json';
const d=JSON.parse(fs.readFileSync(f,'utf8'));
let c=0; d.templates.forEach(t=>{ if(t.representativePages&&t.representativePages.length>5){t.representativePages=t.representativePages.slice(0,5);c++;} });
fs.writeFileSync(f,JSON.stringify(d,null,2));
if(c) console.log('Trimmed reps in',c,'templates');
"

python3 "$APPLY_TUNING_SCRIPT" --catalog-dir "$CATALOG_FOLDER" --decisions "${CATALOG_FOLDER}/.decisions.json" 2>&1 | tail -3
node "$VALIDATE_SCRIPT" "${CATALOG_FOLDER}/template-catalog.json" "${SITE_CATALOG_SKILL}/schemas/template-catalog.schema.json" --logFile "$LOG_FILE"
mkdir -p "${CATALOG_FOLDER}/.blocks"
echo "=== block rollup ==="
node "${SKILL_DIR}/scripts/catalog-block-rollup.js" "$CATALOG_FOLDER"
echo "=== summary ==="
node "${PLUGIN_ROOT}/skills/excat-site-scope/scripts/generate-summary.js" "${CATALOG_FOLDER}" >/dev/null 2>&1
node "${PLUGIN_ROOT}/skills/excat-site-scope/scripts/present-completion-summary.js" "${CATALOG_FOLDER}"
