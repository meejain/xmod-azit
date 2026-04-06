#!/bin/bash
TOKEN="$1"
CONTENT_IMPORT_SCRIPTS_DIR="/home/node/.excat-marketplace/excat/skills/excat-content-import/scripts"

echo "========================================="
echo "STEP 1: RE-IMPORT 110 PAGES (2017+2018)"
echo "========================================="
node ${CONTENT_IMPORT_SCRIPTS_DIR}/run-bulk-import.js \
  --import-script tools/importer/import-press-release.bundle.js \
  --urls tools/importer/urls-2017-2018.txt 2>&1 | tail -3

echo ""
echo "========================================="
echo "STEP 2: EXTRACT NEW PDF URLS"
echo "========================================="
# Scrape original PDF paths from source pages
while IFS= read -r url; do
  pdf=$(curl -sL "$url" 2>/dev/null | grep -oP 'href="(/content/dam/[^"]+\.pdf)"' | head -1 | sed 's/href="//;s/"$//')
  if [ -n "$pdf" ]; then
    echo "$pdf"
  fi
done < /workspace/tools/importer/urls-2017-2018.txt | sort -u > /workspace/tools/importer/pdf-2017-2018-originals.txt

# Get already-uploaded PDFs
cat /workspace/tools/importer/pdf-original-paths.txt /workspace/tools/importer/pdf-new-only.txt 2>/dev/null | sort -u > /workspace/tools/importer/pdf-already-uploaded.txt

# Find truly new PDFs
comm -23 /workspace/tools/importer/pdf-2017-2018-originals.txt /workspace/tools/importer/pdf-already-uploaded.txt > /workspace/tools/importer/pdf-truly-new.txt 2>/dev/null
NEW_PDFS=$(wc -l < /workspace/tools/importer/pdf-truly-new.txt)
echo "New PDFs to upload: $NEW_PDFS"

echo ""
echo "========================================="
echo "STEP 3: UPLOAD NEW PDFs"
echo "========================================="
PDF_OK=0
PDF_FAIL=0
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
      PDF_OK=$((PDF_OK + 1))
      echo "✅ PDF [$PDF_OK] $(basename "$orig_path")"
    else
      PDF_FAIL=$((PDF_FAIL + 1))
      echo "❌ PDF Upload($upload_code): $(basename "$orig_path")"
    fi
  else
    PDF_FAIL=$((PDF_FAIL + 1))
    echo "❌ PDF DL($http_code): $(basename "$orig_path")"
  fi
  rm -f "$tmpfile"
done < /workspace/tools/importer/pdf-truly-new.txt
echo "PDFs: OK=$PDF_OK, Fail=$PDF_FAIL"

echo ""
echo "========================================="
echo "STEP 4: UPLOAD + PREVIEW + PUBLISH CONTENT"
echo "========================================="
PAGE_OK=0
PAGE_FAIL=0
while IFS= read -r url; do
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
      PAGE_OK=$((PAGE_OK + 1))
      echo "✅ Page [$PAGE_OK] $(basename "$file" .plain.html)"
    else
      PAGE_FAIL=$((PAGE_FAIL + 1))
      echo "❌ Page($upload_code): $(basename "$file")"
    fi
  fi
done < /workspace/tools/importer/urls-2017-2018.txt
echo "Pages: OK=$PAGE_OK, Fail=$PAGE_FAIL"

echo ""
echo "========================================="
echo "ALL COMPLETE"
echo "========================================="
