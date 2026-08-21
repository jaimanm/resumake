const chokidar = require('chokidar');
const execa = require('execa');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

module.exports = async function devCommand() {
  console.log(chalk.cyan('Starting live-development server...'));
  
  const watcher = chokidar.watch('**/*.tex', {
    ignored: /(^|[\/\\])\../,
    persistent: true
  });

  watcher
    .on('ready', () => console.log(chalk.green('Watching for changes in .tex files...')))
    .on('change', async fileChanged => {
      console.log(chalk.yellow(`\nFile ${fileChanged} has been changed. Rebuilding...`));
      try {
        await execa('./build_all.sh');
        console.log(chalk.green('Build successful!'));
        
        console.log(chalk.cyan('Syncing directly to Google Drive locally...'));
        const actionPath = path.join(process.cwd(), '.github/workflows/build-resume.yml');
        let driveFolder = 'Resumes';
        
        if (fs.existsSync(actionPath)) {
            const actionContent = fs.readFileSync(actionPath, 'utf8');
            const driveMatch = actionContent.match(/rclone sync PDF_Exports\/ gdrive:(.*?)\//);
            if (driveMatch) driveFolder = driveMatch[1];
        }
        
        await execa('rclone', ['sync', 'PDF_Exports/', `gdrive:${driveFolder}/`]);
        console.log(chalk.green(`⚡️ Instant sync to Google Drive (${driveFolder}) complete!`));
        
      } catch (error) {
        console.log(chalk.red('Build or sync failed! See build.log for details.'));
        fs.writeFileSync('build.log', (error.stdout || '') + '\n' + (error.stderr || ''));
      }
    });
};
