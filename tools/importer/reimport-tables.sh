#!/bin/bash
TOKEN="$1"
CONTENT_IMPORT_SCRIPTS_DIR="/home/node/.excat-marketplace/excat/skills/excat-content-import/scripts"

echo "========================================="
echo "STEP 1: RE-IMPORT 22 TABLE PAGES"
echo "========================================="
node ${CONTENT_IMPORT_SCRIPTS_DIR}/run-bulk-import.js \
  --import-script tools/importer/import-press-release.bundle.js \
  --urls tools/importer/urls-table-pages.txt 2>&1 | grep -E "✅|❌|Completed|Starting run"

echo ""
echo "========================================="
echo "STEP 2: UPLOAD + PREVIEW + PUBLISH"
echo "========================================="
SUCCESS=0
FAIL=0

while IFS= read -r url; do
  slug=$(echo "$url" | sed 's|https://www.astrazeneca.it||;s|\.html||' | tr '[:upper:]' '[:lower:]' | sed 's|_|-|g')
  file="/workspace/content${slug}.plain.html"
  
  if [ -f "$file" ]; then
    rel_path=$(echo "$file" | sed 's|/workspace/||;s|\.plain\.html||')
    da_path="${rel_path}.html"
    preview_path="/${rel_path}"
    
    # Upload
    upload_code=$(curl -s -X PUT "https://admin.da.live/source/meejain/xmod-azit/${da_path}" \
      -H "Authorization: Bearer $TOKEN" \
      -F "data=@${file};type=text/html" \
      -o /dev/null -w "%{http_code}" 2>/dev/null)
    
    if [ "$upload_code" = "200" ] || [ "$upload_code" = "201" ]; then
      # Preview + Publish
      curl -sk -X POST "https://admin.hlx.page/preview/meejain/xmod-azit/main${preview_path}" \
        -H "Authorization: Bearer $TOKEN" -o /dev/null 2>/dev/null
      curl -sk -X POST "https://admin.hlx.page/live/meejain/xmod-azit/main${preview_path}" \
        -H "Authorization: Bearer $TOKEN" -o /dev/null 2>/dev/null
      SUCCESS=$((SUCCESS + 1))
      echo "✅ [$SUCCESS] $(basename "$file" .plain.html)"
    else
      FAIL=$((FAIL + 1))
      echo "❌ Upload($upload_code): $(basename "$file")"
    fi
  else
    FAIL=$((FAIL + 1))
    echo "❌ NotFound: $slug"
  fi
done < /workspace/tools/importer/urls-table-pages.txt

echo ""
echo "========================================="
echo "COMPLETE: Success=$SUCCESS, Failed=$FAIL"
echo "========================================="
