#!/bin/bash
TABLES=0
IFRAMES=0
VIDEOS=0
IMAGES=0
LISTS=0
FORMS=0
TABLE_PAGES=""
IFRAME_PAGES=""
VIDEO_PAGES=""
IMAGE_PAGES=""
TOTAL=0

while IFS= read -r url; do
  TOTAL=$((TOTAL + 1))
  slug=$(basename "$url" .html)
  html=$(curl -sL "$url" 2>/dev/null)
  
  # Check for tables in the rich-text content area
  table_count=$(echo "$html" | grep -c '<table' 2>/dev/null || echo 0)
  if [ "$table_count" -gt 0 ]; then
    TABLES=$((TABLES + 1))
    TABLE_PAGES="${TABLE_PAGES}${slug} (${table_count} tables)\n"
  fi
  
  # Check for iframes (embedded content)
  iframe_count=$(echo "$html" | grep -c '<iframe' 2>/dev/null || echo 0)
  if [ "$iframe_count" -gt 0 ]; then
    IFRAMES=$((IFRAMES + 1))
    IFRAME_PAGES="${IFRAME_PAGES}${slug}\n"
  fi
  
  # Check for video elements
  video_count=$(echo "$html" | grep -c '<video\|youtube\|vimeo' 2>/dev/null || echo 0)
  if [ "$video_count" -gt 0 ]; then
    VIDEOS=$((VIDEOS + 1))
    VIDEO_PAGES="${VIDEO_PAGES}${slug}\n"
  fi
  
  # Check for images in rich-text (not the download icon)
  img_in_content=$(echo "$html" | grep -oP 'class="rich-text".*?</div>' 2>/dev/null | grep -c '<img' 2>/dev/null || echo 0)
  if [ "$img_in_content" -gt 0 ]; then
    IMAGES=$((IMAGES + 1))
    IMAGE_PAGES="${IMAGE_PAGES}${slug}\n"
  fi
  
  # Check for ordered/unordered lists in rich-text
  list_count=$(echo "$html" | grep -oP 'class="rich-text".*?</div>' 2>/dev/null | grep -c '<[ou]l' 2>/dev/null || echo 0)
  if [ "$list_count" -gt 0 ]; then
    LISTS=$((LISTS + 1))
  fi
  
  echo "[$TOTAL/171] $slug - tables:$table_count"
  
done < /workspace/tools/importer/urls-all-press.txt

echo ""
echo "========================================="
echo "CONTENT SCAN RESULTS (171 pages)"
echo "========================================="
echo "Pages with TABLES: $TABLES"
echo "Pages with IFRAMES: $IFRAMES"  
echo "Pages with VIDEOS: $VIDEOS"
echo "Pages with IMAGES in body: $IMAGES"
echo "Pages with LISTS in body: $LISTS"
echo ""
echo "--- TABLE PAGES ---"
echo -e "$TABLE_PAGES"
echo "--- IFRAME PAGES ---"
echo -e "$IFRAME_PAGES"
echo "--- VIDEO PAGES ---"
echo -e "$VIDEO_PAGES"
echo "--- IMAGE PAGES ---"
echo -e "$IMAGE_PAGES"
