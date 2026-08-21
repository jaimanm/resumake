const inquirer = require('inquirer');
const execa = require('execa');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const ora = require('ora');

module.exports = async function configCommand() {
  const actionPath = path.join(process.cwd(), '.github/workflows/build-resume.yml');
  
  if (!fs.existsSync(actionPath)) {
    console.log(chalk.red('Error: Could not find .github/workflows/build-resume.yml in the current directory.'));
    console.log(chalk.yellow('Make sure you are running this command from the root of your resume repository.'));
    process.exit(1);
  }

  let actionContent = fs.readFileSync(actionPath, 'utf8');
  
  // Extract current drive folder
  const driveMatch = actionContent.match(/rclone sync PDF_Exports\/ gdrive:(.*?)\//);
  const currentDriveFolder = driveMatch ? driveMatch[1] : 'Resumes';

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'driveFolder',
      message: 'What folder in Google Drive should your PDFs sync to?',
      default: currentDriveFolder
    }
  ]);

  const { driveFolder } = answers;

  if (driveFolder === currentDriveFolder) {
    console.log(chalk.green('\nConfiguration is already up to date. No changes made.'));
    return;
  }

  const spinner = ora('Updating configuration and syncing to GitHub...').start();
  
  try {
    // Replace the folder path
    actionContent = actionContent.replace(new RegExp(`gdrive:${currentDriveFolder}\/`, 'g'), `gdrive:${driveFolder}/`);
    fs.writeFileSync(actionPath, actionContent);
    
    // Commit and push the changes
    await execa('git', ['add', actionPath]);
    await execa('git', ['commit', '-m', `chore: update google drive sync folder to ${driveFolder}`]);
    await execa('git', ['push']);
    
    spinner.succeed(`Successfully updated Google Drive sync folder to "${driveFolder}"!`);
  } catch (err) {
    spinner.fail('Failed to update configuration.');
    console.error(chalk.red(err.message));
    process.exit(1);
  }
};
