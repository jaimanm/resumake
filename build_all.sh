#!/bin/bash

mkdir -p PDF_Exports

echo "Building Resume..."
latexmk -xelatex -jobname="Awesome_CV_Resume" -output-directory="PDF_Exports" resume.tex

echo "Building CV..."
latexmk -xelatex -jobname="Awesome_CV_Full" -output-directory="PDF_Exports" cv.tex

echo "Building Cover Letter..."
latexmk -xelatex -jobname="Awesome_CV_CoverLetter" -output-directory="PDF_Exports" coverletter.tex

# Clean up auxiliary build files
find PDF_Exports -type f ! -name "*.pdf" -delete

echo "Done! Your PDFs are organized in the PDF_Exports directory."
