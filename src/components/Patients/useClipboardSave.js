import { useRef, useState } from 'react';
import { patientRequest } from '../../services/patientNotes';

// The exact loaded version remains the baseline, including after a conflict.
export default function useClipboardSave({ note, draft, onSaved, onReview, onError }) {
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const request = useRef(null);
  const save = async () => {
    if (pending.current || !note || !draft.trim()) return false;
    if (draft === note.note) return true;
    const key = JSON.stringify([note.timestamp, note.version, draft]);
    if (request.current?.key !== key) request.current = { key, id: crypto.randomUUID() };
    pending.current = true; setBusy(true);
    try {
      const result = await patientRequest('saveNote', {
        timestamp: note.timestamp, expectedVersion: note.version,
        note: draft, requestId: request.current.id, confirmContextReview: false,
      });
      if (['CONFIRMATION_REQUIRED', 'CONTEXT_REVIEW_REQUIRED'].includes(result.status)) {
        onReview({ note, text: draft });
        return 'confirmation';
      }
      if (result.status !== 'SAVED' || !result.note) throw new Error('Save was not confirmed. Your draft is preserved.');
      request.current = null; onSaved(result.note); return true;
    } catch (error) {
      onError(error.code === 'CONFLICT' ? 'This note changed elsewhere. Your draft is preserved; review the saved version in Patients before trying again.' : error.message);
      return false;
    } finally { pending.current = false; setBusy(false); }
  };
  return { save, busy };
}
