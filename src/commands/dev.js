const chokidar = require('chokidar');
const execa = require('execa');
const chalk = require('chalk');
const fs = require('fs');

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
      } catch (error) {
        console.log(chalk.red('Build failed! See build.log for details.'));
        fs.writeFileSync('build.log', (error.stdout || '') + '\n' + (error.stderr || ''));
      }
    });
};
