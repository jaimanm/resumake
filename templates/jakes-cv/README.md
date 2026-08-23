# ResuMake

A magical, fully-automated LaTeX resume workflow. Write your resume in LaTeX, and automatically compile it, release it, and sync it to Google Drive every time you push.

## Features
- 🚀 **Interactive CLI Setup:** Automatically scaffolds a private GitHub repo and sets up Google Drive Sync.
- 🔄 **Live Reloading:** Watch mode that automatically recompiles your PDFs instantly on file save.
- ☁️ **Cloud CI/CD & Sync:** Uses GitHub actions to safely store your compiled PDF resume in Google Drive and create GitHub releases!
- 🎨 **Multiple Templates:** Choose from Modular Multi-Resume, Awesome-CV, and Jake's Resume!

## Getting Started

1. Clone this repository to bootstrap your environment:
   ```bash
   git clone https://github.com/jaimanm/resumake.git
   cd resumake
   ```
2. Run the interactive setup wizard:
   ```bash
   ./cli setup
   ```
3. Follow the CLI instructions to authenticate with Google Drive, pick a template, and it will scaffold your new private resume repository!

## Local Development
After setup, navigate to your **newly created private repository** and run:
```bash
./cli dev
```
This will start a watcher that instantly rebuilds your `.pdf` using local LaTeX tools every time you save a `.tex` file.
