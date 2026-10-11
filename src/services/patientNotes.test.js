import { fetchAuthSession } from 'aws-amplify/auth';
import { deliverPatientPdf } from './patientPdfDelivery';
import { exportPatientNotes } from './patientNotes';
jest.mock('aws-amplify/api', () => ({ generateClient: jest.fn() }));
jest.mock('aws-amplify/auth', () => ({ fetchAuthSession: jest.fn() }));
jest.mock('./patientPdfDelivery', () => ({ deliverPatientPdf: jest.fn() }));
beforeEach(() => {
  jest.clearAllMocks();
  process.env.REACT_APP_PATIENT_EXPORT_URL = 'https://synthetic.invalid/export';
  fetchAuthSession.mockResolvedValue({ tokens: { accessToken: { toString: () => 'synthetic-token' } } });
  global.fetch = jest.fn();
});
afterEach(() => { delete process.env.REACT_APP_PATIENT_EXPORT_URL; });
test('only verified PDF bytes reach native delivery and its cancellation result propagates', async () => {
  const blob = new Blob(['%PDF-synthetic'], { type: 'application/pdf' });
  fetch.mockResolvedValue({ ok: true, headers: { get: () => String(blob.size) }, blob: async () => blob });
  deliverPatientPdf.mockResolvedValue({ native: true, cancelled: true });
  expect(await exportPatientNotes({ noteTimestamps: ['synthetic'] })).toEqual({ native: true, cancelled: true });
  expect(deliverPatientPdf).toHaveBeenCalledWith(blob);
});
test.each([['text/html', '14', 14], ['application/pdf', '12', 14], ['application/pdf', null, 14], ['application/pdf', '20971521', 20971521]])('rejects invalid PDF response %s %s', async (type, length, size) => {
  fetch.mockResolvedValue({ ok: true, headers: { get: () => length }, blob: async () => ({ type, size }) });
  await expect(exportPatientNotes({})).rejects.toThrow('not a supported PDF');
  expect(deliverPatientPdf).not.toHaveBeenCalled();
});
