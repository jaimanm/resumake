const setupCommand = require('../src/commands/setup');
const inquirer = require('inquirer');
const execa = require('execa');

// Tell Jest to "mock" these external libraries
jest.mock('inquirer');
jest.mock('execa');

describe('Setup Command CLI Logic', () => {
  let exitMock, logMock, errorMock, chdirMock;

  beforeEach(() => {
    // 1. Intercept process.exit so a failure path doesn't crash the Jest test runner!
    exitMock = jest.spyOn(process, 'exit').mockImplementation(() => {});
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

  it('Happy Path: Successfully scaffolds repo and sets Google Drive token', async () => {
    // MOCK 1: Dependency Checker (pretend git, gh, and rclone are already installed)
    execa.mockResolvedValueOnce({ stdout: 'git version' });
    execa.mockResolvedValueOnce({ stdout: 'gh version' });
    execa.mockResolvedValueOnce({ stdout: 'rclone v1' });

    // MOCK 2: User Inputs for the setup questions
    inquirer.prompt.mockResolvedValueOnce({
      repoName: 'my-test-resume',
      template: 'modular-multi'
    });

    // MOCK 3: GitHub scaffolding shell commands
    execa.mockResolvedValueOnce({ stdout: 'Logged in' }); // gh auth status
    execa.mockResolvedValueOnce({}); // gh repo create
    execa.mockResolvedValueOnce({}); // git remote add
    execa.mockResolvedValueOnce({}); // git fetch
    execa.mockResolvedValueOnce({}); // git reset
    execa.mockResolvedValueOnce({}); // git push

    // MOCK 4: User confirming they are ready for the Google Drive browser popup
    inquirer.prompt.mockResolvedValueOnce({ ready: true });

    // MOCK 5: Simulate catching the Google OAuth token from rclone's stdout!
    const fakeToken = `{"access_token":"super-secret-token","token_type":"Bearer"}`;
    execa.mockResolvedValueOnce({ 
      stdout: `Paste the following into your remote machine --->\n${fakeToken}\n<---End paste`,
      stderr: ''
    });

    // MOCK 6: Simulate gh secret set
    execa.mockResolvedValueOnce({});

    // EXECUTE: Run the command!
    await setupCommand();

    // ASSERT: Verify our CLI executed the exact logic we expect under the hood!
    expect(chdirMock).toHaveBeenCalledWith('my-test-resume');
    expect(execa).toHaveBeenCalledWith('git', ['reset', '--hard', 'template/template/modular-multi']);
    expect(execa).toHaveBeenCalledWith('gh', ['secret', 'set', 'RCLONE_CONF', '--body', expect.stringContaining('super-secret-token')]);
    
    // Ensure the program didn't try to crash/exit
    expect(exitMock).not.toHaveBeenCalled();
  });

  it('Error Path: Triggers Homebrew installer if dependencies are missing', async () => {
    // MOCK 1: Dependency Checker (pretend they are ALL missing!)
    execa.mockRejectedValueOnce(new Error('command not found')); // git
    execa.mockRejectedValueOnce(new Error('command not found')); // gh
    execa.mockRejectedValueOnce(new Error('command not found')); // rclone

    // MOCK 2: User says "Yes" to automatically installing via Homebrew
    inquirer.prompt.mockResolvedValueOnce({ install: true });

    // MOCK 3: Simulate Homebrew succeeding
    execa.mockResolvedValueOnce({}); // brew install git gh rclone

    // MOCK 4: Setup inputs so the rest of the script doesn't crash when it continues
    inquirer.prompt.mockResolvedValueOnce({ repoName: 'test', template: 'standard' });
    execa.mockResolvedValue({}); // Catch-all for remaining execa calls
    inquirer.prompt.mockResolvedValueOnce({ ready: false }); // Skip drive auth

    await setupCommand();

    // ASSERT: Verify the CLI attempted to run `brew install git gh rclone`
    expect(execa).toHaveBeenCalledWith('brew', ['install', 'git', 'gh', 'rclone']);
  });
});
