#!/bin/bash
TOKEN="$1"
PREVIEW_OK=0
PREVIEW_FAIL=0
PUBLISH_OK=0
PUBLISH_FAIL=0
TOTAL=0

while IFS= read -r url; do
  TOTAL=$((TOTAL + 1))
  # Convert source URL to AEM path
  path=$(echo "$url" | sed 's|https://www.astrazeneca.it||;s|\.html||' | tr '[:upper:]' '[:lower:]' | sed 's|_|-|g')
  
  # Preview
  p_code=$(curl -sk -X POST "https://admin.hlx.page/preview/meejain/xmod-azit/main/content${path}" \
    -H "Authorization: Bearer $TOKEN" -o /dev/null -w "%{http_code}" 2>/dev/null)
  
  if [ "$p_code" = "200" ]; then
    PREVIEW_OK=$((PREVIEW_OK + 1))
  else
    PREVIEW_FAIL=$((PREVIEW_FAIL + 1))
  fi
  
  # Publish
  l_code=$(curl -sk -X POST "https://admin.hlx.page/live/meejain/xmod-azit/main/content${path}" \
    -H "Authorization: Bearer $TOKEN" -o /dev/null -w "%{http_code}" 2>/dev/null)
  
  if [ "$l_code" = "200" ]; then
    PUBLISH_OK=$((PUBLISH_OK + 1))
    echo "✅ [$TOTAL/171] https://main--xmod-azit--meejain.aem.live/content${path}"
  else
    PUBLISH_FAIL=$((PUBLISH_FAIL + 1))
    echo "❌ [$TOTAL/171] P:$p_code L:$l_code /content${path}"
  fi
  
done < /workspace/tools/importer/urls-all-press.txt

echo ""
echo "========================================="
echo "PREVIEW + PUBLISH COMPLETE"
echo "Preview: OK=$PREVIEW_OK, Fail=$PREVIEW_FAIL"
echo "Publish: OK=$PUBLISH_OK, Fail=$PUBLISH_FAIL"
echo "========================================="
