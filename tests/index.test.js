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
    fs.cpSync = jest.fn();
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue('gdrive:Resumes/');
    fs.writeFileSync.mockReturnValue(true);

    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('setup.js', () => {
    it('Happy Path: Successfully scaffolds repo, updates action file, and sets Google Drive token', async () => {
      execa.mockImplementation((cmd, args) => {
        if (cmd === 'rclone' && args[0] === 'authorize') return Promise.resolve({ stdout: '{"access_token":"super-secret-token","token_type":"Bearer"}', stderr: '' });
        if (cmd === 'git' && args[0] === 'config') return Promise.resolve({ stdout: 'https://github.com/test/repo.git\n' });
        return Promise.resolve({ stdout: '' });
      });

      inquirer.prompt.mockResolvedValueOnce({
        targetDir: '..',
        repoName: 'my-test-resume',
        template: 'modular-multi',
        driveFolder: 'MyResumes'
      });
      inquirer.prompt.mockResolvedValueOnce({ ready: true });

      await setupCommand();

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '.github/workflows/build-resume.yml',
        expect.stringContaining('gdrive:MyResumes/')
      );
      expect(execa).toHaveBeenCalledWith('gh', ['secret', 'set', 'RCLONE_CONF', '--body', expect.stringContaining('super-secret-token'), '-R', 'https://github.com/test/repo.git']);
      expect(exitMock).not.toHaveBeenCalled();
    });

    it('Error Path: Triggers Homebrew installer if dependencies are missing', async () => {
      execa.mockImplementation((cmd, args) => {
        if (['git', 'gh', 'rclone'].includes(cmd) && args[0] === '--version') return Promise.reject(new Error('command not found'));
        return Promise.resolve({ stdout: '' });
      });
      inquirer.prompt.mockResolvedValueOnce({ install: true });
      inquirer.prompt.mockResolvedValueOnce({ targetDir: '..', repoName: 'test', template: 'modular-multi', driveFolder: 'Resumes' });
      inquirer.prompt.mockResolvedValueOnce({ ready: false });

      await setupCommand();

      expect(execa).toHaveBeenCalledWith('brew', ['install', 'git', 'gh', 'rclone']);
    });

    it('Error Path: Suggests "gh auth login" if GitHub auth fails', async () => {
      execa.mockImplementation((cmd, args) => {
        if (cmd === 'gh' && args[0] === 'auth') return Promise.reject(new Error('auth failed'));
        return Promise.resolve({ stdout: '' });
      });

      inquirer.prompt.mockResolvedValueOnce({ targetDir: '..', repoName: 'test', template: 'modular-multi', driveFolder: 'Resumes' });
      inquirer.prompt.mockResolvedValueOnce({ ready: true });

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

      execa.mockResolvedValueOnce({});
      await changeCallback('resume.tex');

      expect(execa).toHaveBeenCalledWith('./build_all.sh');
    });
  });
});
