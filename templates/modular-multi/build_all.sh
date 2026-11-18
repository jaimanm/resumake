#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"

# Keep the previous exports until every replacement PDF has built successfully.
build_dir=$(mktemp -d "${TMPDIR:-/tmp}/resume-build.XXXXXX")
trap 'rm -rf "$build_dir"' EXIT

build_resume() {
    local variant="$1"
    local folder="$2"
    local output="$build_dir/$folder"
    mkdir -p "$output"
    echo "Building $folder Resume..."
    latexmk -pdf -interaction=nonstopmode -halt-on-error \
        -jobname="Jaiman_Munshi_Resume" -output-directory="$output" \
        "resume_${variant}.tex"

    local pdfs
    shopt -s nullglob
    pdfs=("$output"/*.pdf)
    if [[ ${#pdfs[@]} -ne 1 ]]; then
        echo "Expected exactly one PDF for $folder." >&2
        exit 1
    fi
    local pdf="${pdfs[0]}"
    if [[ ! -s "$pdf" ]] || [[ "$(head -c 5 "$pdf")" != "%PDF-" ]]; then
        echo "Missing or invalid PDF: $pdf" >&2
        exit 1
    fi
}

build_resume backend Backend
build_resume aiml AIML
build_resume quantum Quantum

# Publish only validated PDFs after all three builds have passed.
find "$build_dir" -type f ! -name '*.pdf' -delete
rm -rf PDF_Exports
mv "$build_dir" PDF_Exports

echo "Built and verified all three resume PDFs in PDF_Exports."
