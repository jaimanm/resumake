# ResuMake

[![npm version](https://img.shields.io/npm/v/@jaimanm/resumake.svg)](https://www.npmjs.com/package/@jaimanm/resumake)

A magical, fully-automated LaTeX resume workflow. Write your resume in LaTeX, and automatically compile it, release it, and sync it to Google Drive every time you push.

## Why ResuMake?
The core philosophy behind ResuMake is to treat your resume like a professional software engineering project:
1. **Local Live-Editing:** Use `resumake dev` to instantly see your PDF update as you make local LaTeX code changes.
2. **Version Control for Code:** Push your changes to GitHub to maintain a perfect, branched version history of the raw LaTeX code.
3. **Version Control for PDFs:** GitHub Actions automatically compiles and creates historical GitHub Releases, giving you version control for the actual compiled PDFs.
4. **Frictionless "Production" Access:** The CI/CD pipeline syncs the compiled releases directly to your Google Drive Desktop. You always have immediate, one-click access to your most up-to-date "production" PDF when applying for jobs, without manually downloading or moving files.

## Features
- 🚀 **Interactive CLI Setup:** Automatically scaffolds a private GitHub repo and sets up Google Drive Sync.
- 🔄 **Live Reloading:** Watch mode that automatically recompiles your PDFs instantly on file save.
- ☁️ **Cloud CI/CD & Sync:** Uses GitHub actions to safely store your compiled PDF resume in Google Drive and create GitHub releases!
- 🎨 **Multiple Templates:** Choose from Modular Multi-Resume, Awesome-CV, and Jake's Resume!

## Getting Started

1. Install the CLI globally via NPM:
   ```bash
   npm install -g @jaimanm/resumake
   ```
2. Run the interactive setup wizard anywhere on your machine:
   ```bash
   resumake setup
   ```
3. Follow the CLI instructions to authenticate with Google Drive, pick a template, and it will scaffold your new private resume repository!

## Local Development
After setup, navigate to your **newly created private repository** and run:
```bash
resumake dev
```
This will start a watcher that instantly rebuilds your `.pdf` using local LaTeX tools every time you save a `.tex` file.
