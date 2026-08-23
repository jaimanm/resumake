#!/bin/bash

mkdir -p PDF_Exports

# Dynamically extract first and last name from cv.tex
FIRST=$(grep '\\newcommand{\\firstname}' cv.tex | grep -o '{[^}]*}$' | tr -d '{}')
LAST=$(grep '\\newcommand{\\lastname}' cv.tex | grep -o '{[^}]*}$' | tr -d '{}')
JOBNAME="${FIRST}_${LAST}_CV"

echo "Building ${FIRST} ${LAST}'s CV..."
latexmk -pdf -interaction=nonstopmode -halt-on-error -jobname="$JOBNAME" -output-directory="PDF_Exports" cv.tex

# Clean up auxiliary build files
find PDF_Exports -type f ! -name "*.pdf" -delete

echo "Done! Your PDFs are organized in the PDF_Exports directory."

# Clean up auxiliary build folders to keep the workspace clean
rm -rf cv_build
