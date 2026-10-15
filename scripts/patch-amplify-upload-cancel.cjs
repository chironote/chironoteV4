// Targeted workaround for Amplify Storage 6.7.11's multipart cancellation race.
// Keep both shipped runtimes aligned. Unknown package changes require review.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const VERSION = '6.7.11';
const TARGETS = [
  { format: 'esm', file: 'dist/esm/providers/s3/apis/internal/uploadData/multipart/uploadHandlers.mjs',
    sha256: 'c74e62ad11e91e03f51486ac1e726a2eb05522b08fe2341fb4cdc625f09ac1ca' },
  { format: 'cjs', file: 'dist/cjs/providers/s3/apis/internal/uploadData/multipart/uploadHandlers.js',
    sha256: 'f42fd310e63866d43c1e20fc7e196c2873f0bce9191110ba31592844728aa5d3' }
];
const digest = source => crypto.createHash('sha256').update(source).digest('hex');
const replaceOnce = (source, before, after) => {
  if (source.split(before).length !== 2) throw new Error('Unexpected Amplify multipart source; review the cancellation patch.');
  return source.replace(before, after);
};

function replacements(format) {
  const canceledError = format === 'esm' ? 'CanceledError' : 'CanceledError_1.CanceledError';
  const remoteAbort = format === 'esm' ? 'abortMultipartUpload' : '(0, s3data_1.abortMultipartUpload)';
  return [
    ['    let abortController;', '    let abortController;\n    let chiroNoteUploadCancelled = false;'],
    ['        abortController = new AbortController();',
      `        if (chiroNoteUploadCancelled) throw new ${canceledError}();\n        abortController = new AbortController();`],
    ['    const onCancel = (message) => {', '    const onCancel = (message) => {\n        chiroNoteUploadCancelled = true;'],
    [`            await ${remoteAbort}(resolvedS3Config, {`,
      `            if (!resolvedS3Config || !inProgressUpload?.uploadId) return;\n            await ${remoteAbort}(resolvedS3Config, {`]
  ];
}

function patchSource(source, target) {
  const edits = replacements(target.format);
  let original = source;
  if (source.includes('chiroNoteUploadCancelled')) {
    for (const [before, after] of [...edits].reverse()) original = replaceOnce(original, after, before);
  }
  if (digest(original) !== target.sha256) throw new Error('Amplify Storage source hash changed; review the cancellation patch before building.');
  return edits.reduce((text, [before, after]) => replaceOnce(text, before, after), original);
}

function applyStoragePatch(repositoryRoot = path.resolve(__dirname, '..')) {
  const packagePath = require.resolve('@aws-amplify/storage/package.json', { paths: [repositoryRoot] });
  const relative = path.relative(path.join(repositoryRoot, 'node_modules'), packagePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Install Amplify inside this checkout before patching it.');
  if (JSON.parse(fs.readFileSync(packagePath, 'utf8')).version !== VERSION) {
    throw new Error(`Expected Amplify Storage ${VERSION}; review the cancellation patch for this dependency version.`);
  }
  // Validate every target before changing either runtime; never silently skip.
  const updates = TARGETS.map(target => {
    const file = path.join(path.dirname(packagePath), target.file);
    const source = fs.readFileSync(file, 'utf8');
    return { file, source, patched: patchSource(source, target) };
  });
  for (const { file, source, patched } of updates) if (source !== patched) fs.writeFileSync(file, patched);
  return updates.length;
}

module.exports = { applyStoragePatch, patchSource, TARGETS };
if (require.main === module) {
  applyStoragePatch();
  console.log(`Verified Amplify Storage ${VERSION} multipart cancellation fence (ESM and CJS).`);
}
