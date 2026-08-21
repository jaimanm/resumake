const setupCommand = require('../src/commands/setup');
const devCommand = require('../src/commands/dev');
const inquirer = require('inquirer');
const execa = require('execa');
const chokidar = require('chokidar');

// Tell Jest to "mock" these external libraries
jest.mock('inquirer');
jest.mock('execa');
jest.mock('chokidar');

describe('CLI Commands', () => {
  let exitMock, logMock, errorMock, chdirMock;

  beforeEach(() => {
    // 1. Intercept process.exit so a failure path throws instead of crashing the process OR silently continuing!
    exitMock = jest.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit(${code}) called`);
    });
    // 2. Intercept process.chdir so it doesn't actually change our test environment directory
    chdirMock = jest.spyOn(process, 'chdir').mockImplementation(() => {});
    // 3. Silence console outputs during tests to keep the terminal perfectly clean
    logMock = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorMock = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('setup.js', () => {
    it('Happy Path: Successfully scaffolds repo and sets Google Drive token', async () => {
      execa.mockResolvedValueOnce({ stdout: 'git version' });
      execa.mockResolvedValueOnce({ stdout: 'gh version' });
      execa.mockResolvedValueOnce({ stdout: 'rclone v1' });

      inquirer.prompt.mockResolvedValueOnce({
        repoName: 'my-test-resume',
        template: 'modular-multi'
      });

      execa.mockResolvedValueOnce({ stdout: 'Logged in' }); // gh auth status
      execa.mockResolvedValueOnce({}); // gh repo create
      execa.mockResolvedValueOnce({}); // git remote add
      execa.mockResolvedValueOnce({}); // git fetch
      execa.mockResolvedValueOnce({}); // git reset
      execa.mockResolvedValueOnce({}); // git push

      inquirer.prompt.mockResolvedValueOnce({ ready: true });

      const fakeToken = `{"access_token":"super-secret-token","token_type":"Bearer"}`;
      execa.mockResolvedValueOnce({ 
        stdout: `Paste the following into your remote machine --->\n${fakeToken}\n<---End paste`,
        stderr: ''
      });

      execa.mockResolvedValueOnce({});

      await setupCommand();

      expect(chdirMock).toHaveBeenCalledWith('my-test-resume');
      expect(execa).toHaveBeenCalledWith('git', ['reset', '--hard', 'template/template/modular-multi']);
      expect(execa).toHaveBeenCalledWith('gh', ['secret', 'set', 'RCLONE_CONF', '--body', expect.stringContaining('super-secret-token')]);
      expect(exitMock).not.toHaveBeenCalled();
    });

    it('Error Path: Triggers Homebrew installer if dependencies are missing', async () => {
      execa.mockRejectedValueOnce(new Error('command not found')); // git
      execa.mockRejectedValueOnce(new Error('command not found')); // gh
      execa.mockRejectedValueOnce(new Error('command not found')); // rclone

      inquirer.prompt.mockResolvedValueOnce({ install: true });

      execa.mockResolvedValueOnce({}); // brew install git gh rclone

      inquirer.prompt.mockResolvedValueOnce({ repoName: 'test', template: 'standard' });
      execa.mockResolvedValue({}); // Catch-all for remaining execa calls
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

      inquirer.prompt.mockResolvedValueOnce({ repoName: 'test', template: 'standard' });

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

      expect(execa).toHaveBeenCalledWith('./build_all.sh', [], { stdio: 'inherit' });
    });
  });
});
