const { Command } = require('commander');
const setupCommand = require('./commands/setup');
const devCommand = require('./commands/dev');

const program = new Command();

program
  .name('resume-env')
  .description('CLI to automatically setup a magical LaTeX resume environment')
  .version('1.0.0');

program
  .command('setup')
  .description('Scaffold a new resume project from a template')
  .action(setupCommand);

program
  .command('dev')
  .description('Start the local live-reload development server')
  .action(devCommand);

program.parse();
