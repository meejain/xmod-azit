#!/bin/bash
TOKEN="$1"
SUCCESS=0
FAIL=0

# Find all imported .plain.html files
find /workspace/content/area-stampa/press-releases -name "*.plain.html" | sort | while IFS= read -r file; do
  # Extract the DA path: content/area-stampa/press-releases/2016/caz-avi-chmp
  rel_path=$(echo "$file" | sed 's|/workspace/||;s|\.plain\.html||')
  da_path="${rel_path}.html"
  preview_path=$(echo "$rel_path" | sed 's|^content/|/content/|')

  # 1. Upload to DA
  upload_code=$(curl -s -X PUT "https://admin.da.live/source/meejain/xmod-azit/${da_path}" \
    -H "Authorization: Bearer $TOKEN" \
    -F "data=@${file};type=text/html" \
    -o /dev/null -w "%{http_code}" 2>/dev/null)

  if [ "$upload_code" = "200" ] || [ "$upload_code" = "201" ]; then
    # 2. Preview
    curl -sk -X POST "https://admin.hlx.page/preview/meejain/xmod-azit/main${preview_path}" \
      -H "Authorization: Bearer $TOKEN" -o /dev/null 2>/dev/null

    # 3. Publish
    curl -sk -X POST "https://admin.hlx.page/live/meejain/xmod-azit/main${preview_path}" \
      -H "Authorization: Bearer $TOKEN" -o /dev/null 2>/dev/null

    SUCCESS=$((SUCCESS + 1))
    echo "✅ [$SUCCESS] $(basename "$file" .plain.html)"
  else
    FAIL=$((FAIL + 1))
    echo "❌ Upload($upload_code): $(basename "$file")"
  fi
done

echo ""
echo "=== PUBLISH COMPLETE ==="
echo "Success: $SUCCESS"
echo "Failed: $FAIL"
