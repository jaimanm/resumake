#!/bin/bash
mkdir -p PDF_Exports
echo "Building Jake's Resume..."
latexmk -pdf -interaction=nonstopmode -halt-on-error -jobname="Jakes_Resume" -output-directory="PDF_Exports" resume.tex
find PDF_Exports -type f ! -name "*.pdf" -delete
echo "Done! Your PDFs are organized in the PDF_Exports directory."

