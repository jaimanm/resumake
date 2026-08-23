#!/bin/bash

# Create identifying output directories
mkdir -p PDF_Exports/Backend
mkdir -p PDF_Exports/AIML
mkdir -p PDF_Exports/Quantum

echo "Building Backend Resume..."
latexmk -pdf -jobname="Jaiman_Munshi_Resume" -output-directory="PDF_Exports/Backend" resume_backend.tex

echo "Building AI/ML Resume..."
latexmk -pdf -jobname="Jaiman_Munshi_Resume" -output-directory="PDF_Exports/AIML" resume_aiml.tex

echo "Building Quantum Resume..."
latexmk -pdf -jobname="Jaiman_Munshi_Resume" -output-directory="PDF_Exports/Quantum" resume_quantum.tex

# Clean up all LaTeX auxiliary files, leaving ONLY the PDFs in the export directories
find PDF_Exports -type f ! -name "*.pdf" -delete

echo "Done! Your beautifully named PDFs are organized in the PDF_Exports directory."

# Clean up auxiliary build folders to keep the workspace clean
rm -rf resume_*_build
