#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"

# Keep previous exports until the replacement PDF has built successfully.
build_dir=$(mktemp -d "${TMPDIR:-/tmp}/resume-build.XXXXXX")
trap 'rm -rf "$build_dir"' EXIT

FIRST=$(grep '\\newcommand{\\firstname}' cv.tex | grep -o '{[^}]*}$' | tr -d '{}')
LAST=$(grep '\\newcommand{\\lastname}' cv.tex | grep -o '{[^}]*}$' | tr -d '{}')
JOBNAME="${FIRST}_${LAST}_CV"

echo "Building PDF..."
latexmk -pdf -interaction=nonstopmode -halt-on-error -jobname="$JOBNAME" -output-directory="$build_dir" cv.tex

shopt -s nullglob
pdfs=("$build_dir"/*.pdf)
if [[ ${#pdfs[@]} -ne 1 ]]; then
    echo "Expected exactly one generated PDF." >&2
    exit 1
fi
pdf="${pdfs[0]}"
if [[ ! -s "$pdf" ]] || [[ "$(head -c 5 "$pdf")" != "%PDF-" ]]; then
    echo "Missing or invalid PDF: $pdf" >&2
    exit 1
fi

find "$build_dir" -type f ! -name '*.pdf' -delete
rm -rf PDF_Exports
mv "$build_dir" PDF_Exports

echo "Built and verified the PDF in PDF_Exports."
