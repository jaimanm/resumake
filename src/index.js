const { Command } = require('commander');
const setupCommand = require('./commands/setup');
const devCommand = require('./commands/dev');
const configCommand = require('./commands/config');

const packageJson = require('../package.json');

const program = new Command();

program
  .name('resumake')
  .description('CLI to automatically setup a magical LaTeX resume environment')
  .version(packageJson.version);

program
  .command('setup')
  .description('Scaffold a new resume project from a template')
  .action(setupCommand);

program
  .command('dev')
  .description('Start the local live-reload development server')
  .action(devCommand);

program
  .command('config')
  .description('Configure the CLI settings (e.g., Google Drive sync folder)')
  .action(configCommand);

program.parse();
