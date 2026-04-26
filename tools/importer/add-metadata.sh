#!/bin/bash
# Add published-date and template metadata to all press release pages
# Updates existing metadata blocks or creates new ones

CONTENT_DIR="/workspace/content/area-stampa/press-releases"
UPDATED=0
CREATED=0
ERRORS=0

for f in "$CONTENT_DIR"/{2016,2017,2018,2021,2022,2026}/*.plain.html; do
  [ -f "$f" ] || continue

  name="$(basename "$(dirname "$f")")/$(basename "$f" .plain.html)"

  # Extract title from h1
  title=$(grep -oP '<h1[^>]*>\K[^<]+' "$f" | head -1)

  # Extract date using multiline pattern: Pubblicato/PUBLISHED followed by date paragraph
  pubdate=$(grep -Pzo '(?:Pubblicato|PUBLISHED)</p>\s*<p>([^<]+)' "$f" | tr '\0' '\n' | grep -oP '<p>\K[^<]+')

  if [ -z "$pubdate" ]; then
    echo "⚠️  $name: no date found, skipping"
    ERRORS=$((ERRORS + 1))
    continue
  fi

  # Build the metadata block HTML
  META_BLOCK="<div class=\"metadata\"><div><div>Title</div><div>$title</div></div><div><div>published-date</div><div>$pubdate</div></div><div><div>template</div><div>press-release</div></div></div>"

  if grep -q 'class="metadata"' "$f"; then
    # Replace existing metadata block
    # The metadata is inside the last <div> wrapper: <div><div class="metadata">...</div></div>
    sed -i 's|<div class="metadata">.*</div></div></div>|'"$META_BLOCK"'</div>|' "$f"
    echo "✅ $name: updated metadata (date: $pubdate)"
    UPDATED=$((UPDATED + 1))
  else
    # No metadata block — append one at the end of the file
    # Press release pages end with </div> — add a new section with metadata
    echo "<div>$META_BLOCK</div>" >> "$f"
    echo "✅ $name: created metadata (date: $pubdate)"
    CREATED=$((CREATED + 1))
  fi
done

echo ""
echo "=== Summary ==="
echo "Updated: $UPDATED"
echo "Created: $CREATED"
echo "Errors:  $ERRORS"
echo "Total:   $((UPDATED + CREATED + ERRORS))"
