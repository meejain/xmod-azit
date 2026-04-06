#!/bin/bash
TOKEN="$1"
SUCCESS=0
FAIL=0
TOTAL=$(wc -l < /workspace/tools/importer/pdf-original-paths.txt)

while IFS= read -r orig_path; do
  # URL-encode the path for curl (spaces -> %20)
  encoded_path=$(echo "$orig_path" | sed 's/ /%20/g')
  orig_url="https://www.astrazeneca.it${encoded_path}"
  
  tmpfile="/tmp/pdf_upload_$$.pdf"
  
  # Download from original site
  http_code=$(curl -sL -o "$tmpfile" -w "%{http_code}" "$orig_url" 2>/dev/null)
  
  if [ "$http_code" = "200" ] && [ -s "$tmpfile" ]; then
    # Upload to DA (use encoded path)
    upload_code=$(curl -s -X PUT "https://admin.da.live/source/meejain/xmod-azit${encoded_path}" \
      -H "Authorization: Bearer $TOKEN" \
      -F "data=@${tmpfile};type=application/pdf" \
      -o /dev/null -w "%{http_code}" 2>/dev/null)
    
    if [ "$upload_code" = "200" ] || [ "$upload_code" = "201" ]; then
      # DA lowercases the path - compute it for preview/publish
      lower_path=$(echo "$orig_path" | tr '[:upper:]' '[:lower:]' | sed 's/ /-/g')
      
      # Preview & Publish  
      curl -sk -X POST "https://admin.hlx.page/preview/meejain/xmod-azit/main${lower_path}" \
        -H "Authorization: Bearer $TOKEN" -o /dev/null 2>/dev/null
      curl -sk -X POST "https://admin.hlx.page/live/meejain/xmod-azit/main${lower_path}" \
        -H "Authorization: Bearer $TOKEN" -o /dev/null 2>/dev/null
      
      SUCCESS=$((SUCCESS + 1))
      echo "✅ [$SUCCESS/$TOTAL] $(basename "$orig_path")"
    else
      FAIL=$((FAIL + 1))
      echo "❌ Upload($upload_code): $(basename "$orig_path")"
    fi
  else
    FAIL=$((FAIL + 1))
    echo "❌ DL($http_code): $(basename "$orig_path")"
  fi
  
  rm -f "$tmpfile"
done < /workspace/tools/importer/pdf-original-paths.txt

echo ""
echo "=== COMPLETE ==="
echo "Success: $SUCCESS / $TOTAL"
echo "Failed: $FAIL"
