#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"

# Keep previous exports until the replacement PDF has built successfully.
build_dir=$(mktemp -d "${TMPDIR:-/tmp}/resume-build.XXXXXX")
trap 'rm -rf "$build_dir"' EXIT

echo "Building PDF..."
latexmk -pdf -interaction=nonstopmode -halt-on-error -jobname="Jakes_Resume" -output-directory="$build_dir" resume.tex

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
