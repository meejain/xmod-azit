#!/bin/bash
TOKEN="$1"

echo "========================================="
echo "STEP 3: UPLOADING 58 NEW PDFs TO DA"
echo "========================================="
PDF_SUCCESS=0
PDF_FAIL=0
PDF_TOTAL=$(wc -l < /workspace/tools/importer/pdf-new-only.txt)

while IFS= read -r orig_path; do
  encoded_path=$(echo "$orig_path" | sed 's/ /%20/g')
  orig_url="https://www.astrazeneca.it${encoded_path}"
  tmpfile="/tmp/pdf_upload_$$.pdf"

  http_code=$(curl -sL -o "$tmpfile" -w "%{http_code}" "$orig_url" 2>/dev/null)

  if [ "$http_code" = "200" ] && [ -s "$tmpfile" ]; then
    upload_code=$(curl -s -X PUT "https://admin.da.live/source/meejain/xmod-azit${encoded_path}" \
      -H "Authorization: Bearer $TOKEN" \
      -F "data=@${tmpfile};type=application/pdf" \
      -o /dev/null -w "%{http_code}" 2>/dev/null)

    if [ "$upload_code" = "200" ] || [ "$upload_code" = "201" ]; then
      lower_path=$(echo "$orig_path" | tr '[:upper:]' '[:lower:]' | sed 's/ /-/g')
      curl -sk -X POST "https://admin.hlx.page/preview/meejain/xmod-azit/main${lower_path}" \
        -H "Authorization: Bearer $TOKEN" -o /dev/null 2>/dev/null
      curl -sk -X POST "https://admin.hlx.page/live/meejain/xmod-azit/main${lower_path}" \
        -H "Authorization: Bearer $TOKEN" -o /dev/null 2>/dev/null
      PDF_SUCCESS=$((PDF_SUCCESS + 1))
      echo "✅ PDF [$PDF_SUCCESS/$PDF_TOTAL] $(basename "$orig_path")"
    else
      PDF_FAIL=$((PDF_FAIL + 1))
      echo "❌ PDF Upload($upload_code): $(basename "$orig_path")"
    fi
  else
    PDF_FAIL=$((PDF_FAIL + 1))
    echo "❌ PDF DL($http_code): $(basename "$orig_path")"
  fi
  rm -f "$tmpfile"
done < /workspace/tools/importer/pdf-new-only.txt

echo ""
echo "PDFs: Success=$PDF_SUCCESS, Failed=$PDF_FAIL"
echo ""

echo "========================================="
echo "STEP 4: UPLOAD + PREVIEW + PUBLISH CONTENT"
echo "========================================="
PAGE_SUCCESS=0
PAGE_FAIL=0

# Get the list of newly imported files (from additional templates only)
cat /workspace/tools/importer/urls-additional-templates.txt | while IFS= read -r url; do
  slug=$(echo "$url" | sed 's|https://www.astrazeneca.it||;s|\.html||' | tr '[:upper:]' '[:lower:]' | sed 's|_|-|g')
  file="/workspace/content${slug}.plain.html"

  if [ -f "$file" ]; then
    rel_path=$(echo "$file" | sed 's|/workspace/||;s|\.plain\.html||')
    da_path="${rel_path}.html"
    preview_path="/${rel_path}"

    upload_code=$(curl -s -X PUT "https://admin.da.live/source/meejain/xmod-azit/${da_path}" \
      -H "Authorization: Bearer $TOKEN" \
      -F "data=@${file};type=text/html" \
      -o /dev/null -w "%{http_code}" 2>/dev/null)

    if [ "$upload_code" = "200" ] || [ "$upload_code" = "201" ]; then
      curl -sk -X POST "https://admin.hlx.page/preview/meejain/xmod-azit/main${preview_path}" \
        -H "Authorization: Bearer $TOKEN" -o /dev/null 2>/dev/null
      curl -sk -X POST "https://admin.hlx.page/live/meejain/xmod-azit/main${preview_path}" \
        -H "Authorization: Bearer $TOKEN" -o /dev/null 2>/dev/null
      PAGE_SUCCESS=$((PAGE_SUCCESS + 1))
      echo "✅ Page [$PAGE_SUCCESS] $(basename "$file" .plain.html)"
    else
      PAGE_FAIL=$((PAGE_FAIL + 1))
      echo "❌ Page Upload($upload_code): $(basename "$file")"
    fi
  else
    PAGE_FAIL=$((PAGE_FAIL + 1))
    echo "❌ Page NotFound: $slug"
  fi
done

echo ""
echo "========================================="
echo "COMPLETE"
echo "PDFs: Success=$PDF_SUCCESS, Failed=$PDF_FAIL"
echo "Pages: Success=$PAGE_SUCCESS, Failed=$PAGE_FAIL"
echo "========================================="
