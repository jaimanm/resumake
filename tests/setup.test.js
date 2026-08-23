const inquirer = require('inquirer');
const execa = require('execa');
const setupCommand = require('../src/commands/setup');
const fs = require('fs');

// Mock dependencies
jest.mock('inquirer');
jest.mock('execa');
jest.mock('fs');

describe('resumake setup command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful execution for Git, GH, and Rclone version checks
    execa.mockResolvedValue({ stdout: '', stderr: '' });

    // Mock specific execa calls (like rclone authorize returning a token)
    execa.mockImplementation((cmd, args) => {
      if (cmd === 'rclone' && args[0] === 'authorize') {
        return Promise.resolve({ stdout: '{"access_token": "mock_token_123"}', stderr: '' });
      }
      if (cmd === 'git' && args[0] === 'config' && args[1] === '--get') {
        return Promise.resolve({ stdout: 'https://github.com/jaimanm/mock-repo.git', stderr: '' });
      }
      return Promise.resolve({ stdout: '', stderr: '' });
    });

    // Mock user input
    inquirer.prompt.mockImplementation((questions) => {
      // Return answers based on the prompt type/names
      if (questions[0].name === 'targetDir') {
        return Promise.resolve({
          targetDir: '/mock/path',
          repoName: 'my-resume',
          template: 'awesome-cv',
          driveFolder: 'Resumes'
        });
      }
      if (questions[0].name === 'ready') {
        return Promise.resolve({ ready: true });
      }
      return Promise.resolve({});
    });
    
    // Mock fs so it doesn't try to read/write real files
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue('gdrive:Resumes/');
    fs.writeFileSync.mockReturnValue(true);
    fs.cpSync = jest.fn();
    
    // Spy on process.chdir to avoid changing test runner directory
    jest.spyOn(process, 'chdir').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('executes the correct shell commands to scaffold the template', async () => {
    // Hide console logs during test
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    
    await setupCommand();
    
    // Verify gh repo create was called
    expect(execa).toHaveBeenCalledWith('gh', ['repo', 'create', 'my-resume', '--private', '--clone']);
    
    // Verify template was copied locally
    expect(fs.cpSync).toHaveBeenCalledWith(
      expect.stringContaining('templates/awesome-cv'),
      expect.any(String),
      { recursive: true }
    );
    
    // Verify rclone was executed
    expect(execa).toHaveBeenCalledWith('rclone', ['authorize', 'drive']);
    
    // Verify GitHub Secret was set with the extracted token
    expect(execa).toHaveBeenCalledWith(
      'gh',
      ['secret', 'set', 'RCLONE_CONF', '--body', expect.stringContaining('mock_token_123'), '-R', 'https://github.com/jaimanm/mock-repo.git']
    );
    
    // Verify final push
    expect(execa).toHaveBeenCalledWith('git', ['push', '-u', 'origin', 'main', '--force']);
    
    consoleSpy.mockRestore();
  });
});
