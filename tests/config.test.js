const configCommand = require('../src/commands/config');
const inquirer = require('inquirer');
const execa = require('execa');
const fs = require('fs');

jest.mock('inquirer');
jest.mock('execa');
jest.mock('fs');

const command = (mode, folder) => `rclone ${mode} PDF_Exports/ gdrive:${folder}/ --checksum\nrclone check PDF_Exports/ gdrive:${folder}/ --one-way\n`;

describe('Drive folder configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fs.existsSync.mockReturnValue(true);
    execa.mockResolvedValue({});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it.each([
    ['sync', 'Resumes', 'Applications'],
    ['copy', '', 'Resumes'],
    ['copy', 'Work/Resumes', 'New/Applications'],
    ['copy', 'Resumes.v2', 'Resumes.v3'],
    ['copy', 'Resumes', ''],
  ])('updates %s workflows from "%s" to "%s"', async (mode, current, next) => {
    fs.readFileSync.mockReturnValue(command(mode, current));
    inquirer.prompt.mockResolvedValueOnce({ setting: 'driveFolder' }).mockResolvedValueOnce({ driveFolder: next });
    await configCommand();
    const written = fs.writeFileSync.mock.calls[0][1];
    expect(written).toBe(command(mode, next));
    expect(inquirer.prompt.mock.calls[1][0][0].default).toBe(current);
  });

  it('leaves a copy workflow unchanged when the folder is unchanged', async () => {
    fs.readFileSync.mockReturnValue(command('copy', 'Work/Resumes'));
    inquirer.prompt.mockResolvedValueOnce({ setting: 'driveFolder' }).mockResolvedValueOnce({ driveFolder: 'Work/Resumes' });
    await configCommand();
    expect(fs.writeFileSync).not.toHaveBeenCalled();
    expect(execa).not.toHaveBeenCalled();
  });
});
