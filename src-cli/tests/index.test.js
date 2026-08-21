const setupCommand = require('../src/commands/setup');
const devCommand = require('../src/commands/dev');
const inquirer = require('inquirer');
const execa = require('execa');
const chokidar = require('chokidar');
const fs = require('fs');

jest.mock('inquirer');
jest.mock('execa');
jest.mock('chokidar');
jest.mock('fs');

describe('CLI Commands', () => {
  let exitMock, logMock, errorMock, chdirMock;

  beforeEach(() => {
    exitMock = jest.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit(${code}) called`);
    });
    chdirMock = jest.spyOn(process, 'chdir').mockImplementation(() => {});
    logMock = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorMock = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('setup.js', () => {
    it('Happy Path: Successfully scaffolds repo, updates action file, and sets Google Drive token', async () => {
      execa.mockResolvedValueOnce({ stdout: 'git version' });
      execa.mockResolvedValueOnce({ stdout: 'gh version' });
      execa.mockResolvedValueOnce({ stdout: 'rclone v1' });

      inquirer.prompt.mockResolvedValueOnce({
        targetDir: '..',
        repoName: 'my-test-resume',
        template: 'modular-multi',
        driveFolder: 'MyResumes'
      });

      execa.mockResolvedValueOnce({ stdout: 'Logged in' }); // gh auth status
      execa.mockResolvedValueOnce({}); // gh repo create
      execa.mockResolvedValueOnce({ stdout: 'https://github.com/test/repo.git\n' }); // git config --get remote.origin.url
      execa.mockResolvedValueOnce({}); // git remote add
      execa.mockResolvedValueOnce({}); // git fetch
      execa.mockResolvedValueOnce({}); // git reset
      
      fs.existsSync.mockImplementation((pathStr) => pathStr.includes('build-resume.yml') ? true : false);
      fs.readFileSync.mockReturnValueOnce('... rclone sync PDF_Exports/ gdrive:Resumes/ ...');
      
      execa.mockResolvedValueOnce({}); // git checkout template/main
      execa.mockResolvedValueOnce({}); // git add
      execa.mockResolvedValueOnce({}); // git commit
      execa.mockResolvedValueOnce({}); // git push

      inquirer.prompt.mockResolvedValueOnce({ ready: true });

      const fakeToken = `{"access_token":"super-secret-token","token_type":"Bearer"}`;
      execa.mockResolvedValueOnce({ 
        stdout: `Paste the following into your remote machine --->\n${fakeToken}\n<---End paste`,
        stderr: ''
      });

      execa.mockResolvedValueOnce({}); // gh secret set

      await setupCommand();

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '.github/workflows/build-resume.yml',
        expect.stringContaining('gdrive:MyResumes/')
      );
      expect(execa).toHaveBeenCalledWith('gh', ['secret', 'set', 'RCLONE_CONF', '--body', expect.stringContaining('super-secret-token'), '-R', 'https://github.com/test/repo.git']);
      expect(exitMock).not.toHaveBeenCalled();
    });

    it('Error Path: Exits cleanly if Google Drive sync fails', async () => {
      execa.mockResolvedValueOnce({ stdout: 'git version' });
      execa.mockResolvedValueOnce({ stdout: 'gh version' });
      execa.mockResolvedValueOnce({ stdout: 'rclone v1' });

      inquirer.prompt.mockResolvedValueOnce({
        targetDir: '..',
        repoName: 'my-test-resume',
        template: 'modular-multi',
        driveFolder: 'Resumes'
      });

      execa.mockResolvedValueOnce({ stdout: 'Logged in' }); // gh auth status
      execa.mockResolvedValueOnce({}); // gh repo create
      execa.mockResolvedValueOnce({ stdout: 'https://github.com/test/repo.git\n' }); // git config --get remote.origin.url
      execa.mockResolvedValueOnce({}); // git remote add
      execa.mockResolvedValueOnce({}); // git fetch
      execa.mockResolvedValueOnce({}); // git reset
      fs.existsSync.mockReturnValue(false);
      execa.mockResolvedValueOnce({}); // git checkout template/main
      execa.mockResolvedValueOnce({}); // git add
      execa.mockResolvedValueOnce({}); // git commit
      execa.mockResolvedValueOnce({}); // git push

      inquirer.prompt.mockResolvedValueOnce({ ready: true });

      // Simulate rclone failure
      execa.mockRejectedValueOnce(new Error('rclone crashed'));

      await expect(setupCommand()).rejects.toThrow('process.exit(1) called');
      expect(exitMock).toHaveBeenCalledWith(1);
    });

    it('Error Path: Triggers Homebrew installer if dependencies are missing', async () => {
      execa.mockRejectedValueOnce(new Error('command not found')); // git
      execa.mockRejectedValueOnce(new Error('command not found')); // gh
      execa.mockRejectedValueOnce(new Error('command not found')); // rclone

      inquirer.prompt.mockResolvedValueOnce({ install: true });

      execa.mockResolvedValueOnce({}); // brew install git gh rclone

      inquirer.prompt.mockResolvedValueOnce({ targetDir: '..', repoName: 'test', template: 'standard', driveFolder: 'Resumes' });
      
      execa.mockResolvedValue({ stdout: 'fake-url' }); // Default for all remaining calls
      fs.existsSync.mockReturnValue(false);
      inquirer.prompt.mockResolvedValueOnce({ ready: false }); // Skip drive auth

      await setupCommand();

      expect(execa).toHaveBeenCalledWith('brew', ['install', 'git', 'gh', 'rclone']);
    });

    it('Error Path: Exits if dependencies are missing and user declines install', async () => {
      execa.mockRejectedValueOnce(new Error('command not found')); // git
      execa.mockResolvedValueOnce({ stdout: 'gh version' });
      execa.mockResolvedValueOnce({ stdout: 'rclone v1' });

      inquirer.prompt.mockResolvedValueOnce({ install: false });

      await expect(setupCommand()).rejects.toThrow('process.exit(1) called');
      expect(exitMock).toHaveBeenCalledWith(1);
    });

    it('Error Path: Suggests "gh auth login" if GitHub auth fails', async () => {
      execa.mockResolvedValueOnce({ stdout: 'git version' });
      execa.mockResolvedValueOnce({ stdout: 'gh version' });
      execa.mockResolvedValueOnce({ stdout: 'rclone v1' });

      inquirer.prompt.mockResolvedValueOnce({ targetDir: '..', repoName: 'test', template: 'standard', driveFolder: 'Resumes' });

      // Fail GitHub auth
      execa.mockRejectedValueOnce(new Error('auth failed'));

      await expect(setupCommand()).rejects.toThrow('process.exit(1) called');
      expect(exitMock).toHaveBeenCalledWith(1);
      expect(logMock).toHaveBeenCalledWith(expect.stringContaining('gh auth login'));
    });
  });

  describe('dev.js', () => {
    it('Happy Path: Starts chokidar watcher and rebuilds on file change', async () => {
      let changeCallback;
      const fakeWatcher = {
        on: jest.fn().mockImplementation(function(event, cb) {
          if (event === 'change') changeCallback = cb;
          return this;
        })
      };
      chokidar.watch.mockReturnValue(fakeWatcher);

      await devCommand();

      expect(chokidar.watch).toHaveBeenCalledWith('**/*.tex', expect.any(Object));

      execa.mockResolvedValueOnce({}); // simulate build_all.sh succeeding
      await changeCallback('resume.tex');

      expect(execa).toHaveBeenCalledWith('./build_all.sh');
    });
  });
});
