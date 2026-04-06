#!/bin/bash
TOKEN="$1"
SUCCESS=0
FAIL=0

while IFS= read -r orig_path; do
  # Build original AZ download URL (with original case)
  orig_url="https://www.astrazeneca.it${orig_path}"
  
  # DA upload path (DA will auto-lowercase)
  da_path="$orig_path"
  
  tmpfile="/tmp/pdf_upload_$$.pdf"
  
  # Download from original site
  http_code=$(curl -sL -o "$tmpfile" -w "%{http_code}" "$orig_url" 2>/dev/null)
  
  if [ "$http_code" = "200" ] && [ -s "$tmpfile" ]; then
    # Upload to DA
    upload_code=$(curl -s -X PUT "https://admin.da.live/source/meejain/xmod-azit${da_path}" \
      -H "Authorization: Bearer $TOKEN" \
      -F "data=@${tmpfile};type=application/pdf" \
      -o /dev/null -w "%{http_code}" 2>/dev/null)
    
    if [ "$upload_code" = "200" ] || [ "$upload_code" = "201" ]; then
      # Get the DA-lowercased path for preview/publish
      lower_path=$(echo "$da_path" | tr '[:upper:]' '[:lower:]' | sed 's/ /-/g')
      
      # Preview & Publish
      curl -sk -X POST "https://admin.hlx.page/preview/meejain/xmod-azit/main${lower_path}" \
        -H "Authorization: Bearer $TOKEN" -o /dev/null 2>/dev/null
      curl -sk -X POST "https://admin.hlx.page/live/meejain/xmod-azit/main${lower_path}" \
        -H "Authorization: Bearer $TOKEN" -o /dev/null 2>/dev/null
      
      SUCCESS=$((SUCCESS + 1))
      echo "✅ [$SUCCESS] $orig_path"
    else
      FAIL=$((FAIL + 1))
      echo "❌ Upload failed ($upload_code): $orig_path"
    fi
  else
    FAIL=$((FAIL + 1))
    echo "❌ Download failed ($http_code): $orig_url"
  fi
  
  rm -f "$tmpfile"
done < /workspace/tools/importer/pdf-original-paths.txt

echo ""
echo "Done. Success: $SUCCESS, Failed: $FAIL"
