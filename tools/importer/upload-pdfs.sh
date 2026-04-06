#!/bin/bash
TOKEN="$1"
SUCCESS=0
FAIL=0
SKIP=0

while IFS= read -r aem_url; do
  # Extract the path from the AEM URL
  path=$(echo "$aem_url" | sed 's|https://main--xmod-azit--meejain.aem.live||')
  
  # Build the original AstraZeneca URL
  orig_url="https://www.astrazeneca.it${path}"
  
  # Local temp file
  tmpfile="/tmp/pdf_upload_$$.pdf"
  
  # Download from original site
  http_code=$(curl -sL -o "$tmpfile" -w "%{http_code}" "$orig_url" 2>/dev/null)
  
  if [ "$http_code" = "200" ] && [ -s "$tmpfile" ]; then
    # Upload to DA
    upload_code=$(curl -s -X PUT "https://admin.da.live/source/meejain/xmod-azit${path}" \
      -H "Authorization: Bearer $TOKEN" \
      -F "data=@${tmpfile};type=application/pdf" \
      -o /dev/null -w "%{http_code}" 2>/dev/null)
    
    if [ "$upload_code" = "200" ] || [ "$upload_code" = "201" ]; then
      # Preview
      curl -sk -X POST "https://admin.hlx.page/preview/meejain/xmod-azit/main${path}" \
        -H "Authorization: Bearer $TOKEN" -o /dev/null 2>/dev/null
      # Publish
      curl -sk -X POST "https://admin.hlx.page/live/meejain/xmod-azit/main${path}" \
        -H "Authorization: Bearer $TOKEN" -o /dev/null 2>/dev/null
      
      SUCCESS=$((SUCCESS + 1))
      echo "✅ [$SUCCESS] $path"
    else
      FAIL=$((FAIL + 1))
      echo "❌ Upload failed ($upload_code): $path"
    fi
  else
    FAIL=$((FAIL + 1))
    echo "❌ Download failed ($http_code): $orig_url"
  fi
  
  rm -f "$tmpfile"
done < /workspace/tools/importer/pdf-links.txt

echo ""
echo "Done. Success: $SUCCESS, Failed: $FAIL"
