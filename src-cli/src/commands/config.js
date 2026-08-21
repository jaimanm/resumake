const inquirer = require('inquirer');
const execa = require('execa');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const ora = require('ora');

module.exports = async function configCommand() {
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'setting',
      message: 'What would you like to configure?',
      choices: [
        { name: 'Google Drive Sync Folder', value: 'driveFolder' },
        { name: 'Exported PDF Filename', value: 'pdfName' }
      ]
    }
  ]);

  const { setting } = answers;
  const spinner = ora();

  try {
    if (setting === 'driveFolder') {
      const actionPath = path.join(process.cwd(), '.github/workflows/build-resume.yml');
      if (!fs.existsSync(actionPath)) {
        console.log(chalk.red('Error: Could not find .github/workflows/build-resume.yml. Are you in the project root?'));
        process.exit(1);
      }

      let actionContent = fs.readFileSync(actionPath, 'utf8');
      const driveMatch = actionContent.match(/rclone sync PDF_Exports\/ gdrive:(.*?)\//);
      const currentDriveFolder = driveMatch ? driveMatch[1] : 'Resumes';

      const { driveFolder } = await inquirer.prompt([
        {
          type: 'input',
          name: 'driveFolder',
          message: 'What folder in Google Drive should your PDFs sync to?',
          default: currentDriveFolder
        }
      ]);

      if (driveFolder === currentDriveFolder) {
        console.log(chalk.green('\nConfiguration is already up to date. No changes made.'));
        return;
      }

      spinner.start('Updating configuration and syncing to GitHub...');
      actionContent = actionContent.replace(new RegExp(`gdrive:${currentDriveFolder}\/`, 'g'), `gdrive:${driveFolder}/`);
      fs.writeFileSync(actionPath, actionContent);
      
      await execa('git', ['add', actionPath]);
      await execa('git', ['commit', '-m', `chore: update google drive sync folder to ${driveFolder}`]);
      await execa('git', ['push']);
      
      spinner.succeed(`Successfully updated Google Drive sync folder to "${driveFolder}"!`);
      
    } else if (setting === 'pdfName') {
      const buildPath = path.join(process.cwd(), 'build_all.sh');
      if (!fs.existsSync(buildPath)) {
        console.log(chalk.red('Error: Could not find build_all.sh. Are you in the project root?'));
        process.exit(1);
      }

      let buildContent = fs.readFileSync(buildPath, 'utf8');
      const jobNameMatch = buildContent.match(/-jobname="(.*?)"/);
      const currentPdfName = jobNameMatch ? jobNameMatch[1] : 'Resume';

      const { pdfName } = await inquirer.prompt([
        {
          type: 'input',
          name: 'pdfName',
          message: 'What should your output PDF be named (without .pdf)?',
          default: currentPdfName
        }
      ]);

      if (pdfName === currentPdfName) {
        console.log(chalk.green('\nConfiguration is already up to date. No changes made.'));
        return;
      }

      spinner.start('Updating build script and syncing to GitHub...');
      buildContent = buildContent.replace(/-jobname=".*?"/g, `-jobname="${pdfName}"`);
      fs.writeFileSync(buildPath, buildContent);
      
      await execa('git', ['add', buildPath]);
      await execa('git', ['commit', '-m', `chore: update output PDF filename to ${pdfName}.pdf`]);
      await execa('git', ['push']);
      
      spinner.succeed(`Successfully updated Exported PDF Filename to "${pdfName}.pdf"!`);
    }
  } catch (err) {
    if (spinner.isSpinning) spinner.fail('Failed to update configuration.');
    console.error(chalk.red(err.message));
    process.exit(1);
  }
};
