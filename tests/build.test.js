const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const templates = ['jakes-resume', 'jakes-cv', 'awesome-cv', 'modular-multi'];

describe.each(templates)('%s build safety', (template) => {
  let root, fake, sentinel;
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'resumake-build-'));
    fs.copyFileSync(path.join(__dirname, '../templates', template, 'build_all.sh'), path.join(root, 'build_all.sh'));
    fs.writeFileSync(path.join(root, 'cv.tex'), '\\newcommand{\\firstname}{Test}\n\\newcommand{\\lastname}{User}\n');
    fs.mkdirSync(path.join(root, 'bin'));
    fs.mkdirSync(path.join(root, 'PDF_Exports'));
    fake = path.join(root, 'bin/latexmk');
    sentinel = path.join(root, 'PDF_Exports/previous.pdf');
    fs.writeFileSync(sentinel, '%PDF-previous');
  });
  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  it.each(['compiler failure', 'missing PDF', 'invalid PDF'])('rejects %s and preserves existing exports', (failure) => {
    let script = '#!/bin/bash\n';
    if (failure === 'compiler failure') script += 'exit 17\n';
    if (failure === 'missing PDF') script += 'exit 0\n';
    if (failure === 'invalid PDF') script += 'for arg in "$@"; do case "$arg" in -output-directory=*) out="${arg#*=}";; -jobname=*) name="${arg#*=}";; esac; done\nprintf invalid > "$out/$name.pdf"\n';
    fs.writeFileSync(fake, script, { mode: 0o755 });
    const result = spawnSync('bash', [path.join(root, 'build_all.sh')], {
      env: { ...process.env, PATH: path.join(root, 'bin') + path.delimiter + process.env.PATH },
      encoding: 'utf8',
    });
    expect(result.status).not.toBe(0);
    expect(fs.readFileSync(sentinel, 'utf8')).toBe('%PDF-previous');
  });
});
