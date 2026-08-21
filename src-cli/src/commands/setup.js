const inquirer = require('inquirer');
const execa = require('execa');
const ora = require('ora');
const chalk = require('chalk');

async function checkDependencies() {
  const missing = [];
  try { await execa('git', ['--version']); } catch { missing.push('git'); }
  try { await execa('gh', ['--version']); } catch { missing.push('gh'); }
  try { await execa('rclone', ['--version']); } catch { missing.push('rclone'); }

  if (missing.length > 0) {
    console.log(chalk.yellow(`Missing required dependencies: ${missing.join(', ')}`));
    const { install } = await inquirer.prompt([{
      type: 'confirm',
      name: 'install',
      message: 'Would you like to automatically install them via Homebrew now?',
      default: true
    }]);

    if (install) {
      const spinner = ora('Installing dependencies...').start();
      try {
        await execa('brew', ['install', ...missing]);
        spinner.succeed('Dependencies installed!');
      } catch (err) {
        spinner.fail('Failed to install dependencies automatically. Please install them manually.');
        process.exit(1);
      }
    } else {
      console.log(chalk.red('Cannot proceed without dependencies.'));
      process.exit(1);
    }
  }
}

module.exports = async function setupCommand() {
  console.log(chalk.cyan('\n🚀 Welcome to the Auto-Resume Setup Wizard!\n'));
  
  await checkDependencies();

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'repoName',
      message: 'What would you like to name your new private repository?',
      default: 'my-resume'
    },
    {
      type: 'list',
      name: 'template',
      message: 'Which resume template would you like to use?',
      choices: [
        { name: 'Modular Multi-Resume (3 versions)', value: 'modular-multi' },
        { name: 'Standard (Single version)', value: 'standard' },
        { name: 'Awesome-CV (Professional)', value: 'awesome-cv' },
        { name: "Jake's Resume (Classic)", value: 'jakes-resume' }
      ]
    }
  ]);

  const { repoName, template } = answers;

  console.log(chalk.green(`\nAwesome! Setting up ${repoName} using the ${template} template...\n`));
  
  const scaffoldSpinner = ora('Creating GitHub repository and pulling template...').start();
  try {
    await execa('gh', ['auth', 'status']);
    await execa('gh', ['repo', 'create', repoName, '--private', '--clone']);
    process.chdir(repoName);
    await execa('git', ['remote', 'add', 'template', 'https://github.com/jaimanm/auto-resume-template.git']);
    await execa('git', ['fetch', 'template']);
    await execa('git', ['reset', '--hard', `template/template/${template}`]);
    await execa('git', ['push', '-u', 'origin', 'main']);
    scaffoldSpinner.succeed(`Successfully created ${repoName} and scaffolded template!`);
  } catch (err) {
    scaffoldSpinner.fail('Failed to scaffold repository.');
    console.error(chalk.red(err.message));
    if (err.message.includes('auth')) {
      console.log(chalk.yellow('Please run "gh auth login" first to connect your GitHub account.'));
    }
    process.exit(1);
  }

  console.log(chalk.cyan('\nNow, let\'s set up your Google Drive Sync!'));
  console.log('A browser window will pop open for you to log into Google Drive.');
  
  const { ready } = await inquirer.prompt([{
    type: 'confirm',
    name: 'ready',
    message: 'Ready to authenticate?',
    default: true
  }]);

  if (ready) {
    const driveSpinner = ora('Waiting for Google Drive authentication...').start();
    try {
      const { stdout, stderr } = await execa('rclone', ['authorize', 'drive']);
      const tokenMatch = (stdout + stderr).match(/\{"access_token".*\}/);
      
      if (!tokenMatch) {
        throw new Error('Could not extract token from rclone output.');
      }
      
      const tokenJson = tokenMatch[0];
      const rcloneConfContent = `[gdrive]\ntype = drive\nscope = drive\ntoken = ${tokenJson}`;
      
      driveSpinner.text = 'Uploading token securely to GitHub Secrets...';
      await execa('gh', ['secret', 'set', 'RCLONE_CONF', '--body', rcloneConfContent]);
      driveSpinner.succeed('Google Drive token successfully secured in GitHub Secrets!');
    } catch (err) {
      driveSpinner.fail('Failed to setup Google Drive sync.');
      console.error(chalk.red(err.message));
    }
  }

  console.log(chalk.green(`\n🎉 All done! Your magical resume environment is ready.`));
  console.log(chalk.white(`\nNext steps:`));
  console.log(chalk.cyan(`  cd ${repoName}`));
  console.log(chalk.cyan(`  ./cli dev`));
  console.log(chalk.white(`\nTo live-edit your resume!\n`));
};
