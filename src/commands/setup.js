const inquirer = require('inquirer');
const execa = require('execa');
const ora = require('ora');
const chalk = require('chalk');
const fs = require('fs');

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
  console.log(chalk.cyan('\n🚀 Welcome to the ResuMake Setup Wizard!\n'));
  
  await checkDependencies();

  const path = require('path');

  // ======================================================================
  //  PHASE 1: Collect ALL user inputs before doing anything destructive.
  //  Ctrl+C anywhere in this phase is a clean abort with zero side effects.
  // ======================================================================
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'targetDir',
      message: 'Where would you like to clone your new resume repository locally?',
      default: '..'
    },
    {
      type: 'input',
      name: 'repoName',
      message: 'What would you like to name your new private repository?',
      default: 'my-resume',
      validate: async (input, answers) => {
        if (!input) return 'Repository name cannot be empty.';
        const targetPath = path.resolve(answers.targetDir, input);
        if (fs.existsSync(targetPath)) {
            return `A folder named "${input}" already exists at ${targetPath}. Please choose a different name or directory.`;
        }
        try {
            await execa('gh', ['repo', 'view', input]);
            return `Repository "${input}" already exists on your GitHub account. Please choose a different name.`;
        } catch {
            return true;
        }
      }
    },
    {
      type: 'list',
      name: 'template',
      message: 'Which resume template would you like to use?',
      choices: [
        { name: 'Modular Multi-Resume (3 versions)', value: 'modular-multi' },
        { name: 'Standard (Single version)', value: 'standard' },
        { name: 'Awesome-CV (Professional)', value: 'awesome-cv' },
        { name: "Jake's Resume (Classic)", value: 'jakes-resume' },
        { name: "Jake's CV (Classic + Extended Sections)", value: 'jakes-cv' }
      ]
    },
    {
      type: 'input',
      name: 'driveFolder',
      message: 'What folder in Google Drive should your PDFs sync to?',
      default: 'Resumes'
    }
  ]);

  console.log(chalk.cyan('\nNow, let\'s set up your Google Drive Sync!'));
  console.log('A browser window will pop open for you to log into Google Drive.');
  
  const { ready } = await inquirer.prompt([{
    type: 'confirm',
    name: 'ready',
    message: 'Ready to authenticate?',
    default: true
  }]);

  const { repoName, template, driveFolder, targetDir } = answers;

  // ======================================================================
  //  PHASE 2: Execute all side effects. No more prompts from here on out.
  // ======================================================================
  console.log(chalk.green(`\nAwesome! Setting up ${repoName} using the ${template} template...\n`));
  
  const scaffoldSpinner = ora('Creating GitHub repository and pulling template...').start();
  let remoteUrl;
  try {
    await execa('gh', ['auth', 'status']);
    // Change to target directory before cloning
    const absoluteTargetDir = path.resolve(targetDir);
    if (!fs.existsSync(absoluteTargetDir)) fs.mkdirSync(absoluteTargetDir, { recursive: true });
    process.chdir(absoluteTargetDir);

    await execa('gh', ['repo', 'create', repoName, '--private', '--clone']);
    process.chdir(repoName);
    
    // Get the exact origin URL for future gh CLI calls (fixes multiple remotes bug)
    const urlResult = await execa('git', ['config', '--get', 'remote.origin.url']);
    remoteUrl = urlResult.stdout.trim();

    await execa('git', ['remote', 'add', 'template', 'https://github.com/jaimanm/resumake.git']);
    await execa('git', ['fetch', 'template']);
    await execa('git', ['reset', '--hard', `template/template/${template}`]);
    
    // Customize the GitHub action with the user's preferred Google Drive folder
    const actionPath = '.github/workflows/build-resume.yml';
    if (fs.existsSync(actionPath)) {
        let actionContent = fs.readFileSync(actionPath, 'utf8');
        actionContent = actionContent.replace(/gdrive:Resumes\//g, `gdrive:${driveFolder}/`);
        fs.writeFileSync(actionPath, actionContent);
    }
    
    await execa('git', ['add', '.']);
    await execa('git', ['commit', '-m', `Scaffold ${template} with custom Drive folder`]);
    scaffoldSpinner.succeed(`Successfully created ${repoName} and scaffolded template!`);
  } catch (err) {
    scaffoldSpinner.fail('Failed to scaffold repository.');
    console.error(chalk.red(err.message));
    if (err.message.includes('auth')) {
      console.log(chalk.yellow('Please run "gh auth login" first to connect your GitHub account.'));
    }
    process.exit(1);
  }

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
      await execa('gh', ['secret', 'set', 'RCLONE_CONF', '--body', rcloneConfContent, '-R', remoteUrl]);
      driveSpinner.succeed('Google Drive token successfully secured in GitHub Secrets!');
    } catch (err) {
      driveSpinner.fail('Failed to setup Google Drive sync.');
      console.error(chalk.red(err.message));
      console.log(chalk.yellow('\nPlease try running the setup again, or open an issue on the repository if the problem persists.'));
    }
  }

  const pushSpinner = ora('Pushing initial commit to trigger GitHub Action...').start();
  try {
    await execa('git', ['push', '-u', 'origin', 'main', '--force']);
    pushSpinner.succeed('Initial commit pushed! GitHub Actions is now building and syncing your resume.');
  } catch (err) {
    pushSpinner.fail('Failed to push to GitHub.');
    console.error(chalk.red(err.message));
  }

  console.log(chalk.green(`\n🎉 All done! Your magical resume environment is ready.`));
  console.log(chalk.white(`\nNext steps:`));
  console.log(chalk.cyan(`  cd ${path.join(targetDir, repoName)}`));
  console.log(chalk.cyan(`  resumake dev`));
  console.log(chalk.white(`\nTo live-edit your resume!\n`));
};
