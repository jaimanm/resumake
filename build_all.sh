#!/bin/bash

mkdir -p PDF_Exports

echo "Building CV..."
latexmk -xelatex -interaction=nonstopmode -halt-on-error -jobname="Resume" -output-directory="PDF_Exports" cv.tex

# Clean up auxiliary build files
find PDF_Exports -type f ! -name "*.pdf" -delete

echo "Done! Your PDFs are organized in the PDF_Exports directory."

