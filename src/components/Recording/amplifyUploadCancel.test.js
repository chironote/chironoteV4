import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { patchSource, TARGETS } from '../../../scripts/patch-amplify-upload-cancel.cjs';

const flush = async () => { for (let index = 0; index < 50; index++) await Promise.resolve(); };
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
const configValue = { s3Config: {}, bucket: 'fictional-bucket', identityId: 'fictional-owner', keyPrefix: '' };
const storageRoot = path.dirname(require.resolve('@aws-amplify/storage/package.json'));

function loadFactory(target, { config, checksum } = {}) {
  const source = fs.readFileSync(path.join(storageRoot, target.file), 'utf8');
  const factory = source.slice(source.indexOf('const getMultipartUploadHandlers ='), source.indexOf('const resolveAccessLevel ='));
  const loader = jest.fn(async () => { throw new Error('Synthetic stop before S3 transport'); });
  const cleanup = jest.fn(async () => {});
  class CanceledError extends Error { constructor() { super('cancelled'); this.name = 'CanceledError'; } }
  const utils = {
    resolveS3ConfigAndInput: () => config?.promise || Promise.resolve(configValue),
    validateStorageOperationInput: () => ({ inputType: 'path', objectKey: 'fictional/audio.webm' })
  };
  const crc = { calculateContentCRC32: () => checksum?.promise || Promise.resolve({ checksum: 'fictional' }) };
  const cache = { serializeUploadOptions: () => '{}' };
  const logger = { debug: () => {} };
  const sandbox = {
    AbortController, Amplify: {}, STORAGE_INPUT_KEY: 'key',
    ...utils, ...crc, ...cache, logger, CanceledError,
    loadOrCreateMultipartUpload: loader, abortMultipartUpload: cleanup,
    exports: {}, core_1: { Amplify: {} }, utils_2: utils,
    crc32_1: crc, uploadCache_1: cache, constants_1: { STORAGE_INPUT_KEY: 'key' },
    CanceledError_1: { CanceledError }, initialUpload_1: { loadOrCreateMultipartUpload: loader },
    s3data_1: { abortMultipartUpload: cleanup }, utils_3: { logger }
  };
  const create = vm.runInNewContext(`${factory}\ngetMultipartUploadHandlers`, sandbox);
  const handlers = create({ data: 'fictional audio', options: {} }, 6 * 1024 * 1024);
  return { handlers, loader, cleanup, source };
}

describe.each(TARGETS)('installed Amplify $format multipart runtime', target => {
  test('cancellation before config resolves permanently fences later S3 initialization', async () => {
    const config = deferred(); const { handlers, loader, cleanup } = loadFactory(target, { config });
    const result = handlers.multipartUploadJob();
    const rejected = expect(result).rejects.toMatchObject({ name: 'CanceledError' });
    handlers.onCancel(); await rejected;
    config.resolve(configValue); await flush();
    expect(loader).not.toHaveBeenCalled();
    expect(cleanup).not.toHaveBeenCalled();
  });

  test('normal upload still initializes with an active signal', async () => {
    const { handlers, loader } = loadFactory(target);
    await expect(handlers.multipartUploadJob()).rejects.toThrow('Synthetic stop');
    expect(loader).toHaveBeenCalledTimes(1);
    expect(loader.mock.calls[0][0].abortSignal.aborted).toBe(false);
  });

  test('cancel during later setup leaves an aborted signal on the pending write', async () => {
    const checksum = deferred(); const { handlers, loader } = loadFactory(target, { checksum });
    const result = handlers.multipartUploadJob();
    const rejected = expect(result).rejects.toMatchObject({ name: 'CanceledError' });
    await flush(); handlers.onCancel(); await rejected;
    checksum.resolve({ checksum: 'fictional' }); await flush();
    expect(loader).toHaveBeenCalledTimes(1);
    expect(loader.mock.calls[0][0].abortSignal.aborted).toBe(true);
  });

  test('patch application is idempotent and fails closed on unreviewed dependency changes', () => {
    const { source } = loadFactory(target);
    expect(patchSource(source, target)).toBe(source);
    expect(() => patchSource(`${source}\n`, target)).toThrow('source hash changed');
  });
});
