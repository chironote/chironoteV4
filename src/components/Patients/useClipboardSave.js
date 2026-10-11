import { randomId } from '../../utils/randomId';
import { useEffect, useRef, useState } from 'react';
import { patientRequest } from '../../services/patientNotes';
import { diagnosisReviewForDraft } from './clipboardDiagnoses';

export default function useClipboardSave({ note, draft, onSaved, onError, onCancelReview }) {
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState(null);
  const pending = useRef(false);
  const request = useRef(null);
  const draftKey = JSON.stringify([note?.timestamp, note?.version, draft]);
  const currentKey = useRef(draftKey);
  currentKey.current = draftKey;
  const lastKey = useRef(draftKey);
  const cancelCallback = useRef(onCancelReview);
  cancelCallback.current = onCancelReview;
  useEffect(() => {
    setReview(null);
    if (lastKey.current !== draftKey) cancelCallback.current?.();
    lastKey.current = draftKey;
  }, [draftKey]);
  const cancelReview = () => { setReview(null); onCancelReview?.(); };
  const save = async (approved = null) => {
    if (pending.current || !note || !draft.trim()) return false;
    if (approved && approved.key !== draftKey) { cancelReview(); return false; }
    if (draft === note.note && !note.diagnosisReviewRequired && !note.needsContextReview) return true;
    if (!approved) {
      const diagnosis = diagnosisReviewForDraft(note, draft);
      if (diagnosis || note.needsContextReview) {
        setReview({ key: draftKey, kind: 'local', ...diagnosis, needsContextReview: Boolean(note.needsContextReview) });
        return 'confirmation';
      }
    }
    if (approved?.kind === 'local' && approved.icdCodes?.some(item => !item.description.trim())) {
      onError?.('Add a description for each diagnosis before confirming.'); return false;
    }
    const diagnosisCodes = approved?.kind === 'local' ? approved.icdCodes : undefined;
    const key = JSON.stringify([draftKey, diagnosisCodes]);
    if (request.current?.key !== key) request.current = { key, id: randomId() };
    pending.current = true; setBusy(true); onError?.('');
    try {
      const result = await patientRequest('saveNote', {
        timestamp: note.timestamp, expectedVersion: note.version,
        note: draft, requestId: request.current.id,
        confirmContextReview: Boolean(approved?.contextConfirmed),
        ...(diagnosisCodes !== undefined ? { diagnosisCodes } : {}),
        ...(approved?.confirmationToken ? { confirmationToken: approved.confirmationToken } : {}),
      });
      if (currentKey.current !== draftKey) return false;
      if (['CONFIRMATION_REQUIRED', 'CONTEXT_REVIEW_REQUIRED'].includes(result.status)) {
        setReview({ ...approved, ...result, key: draftKey, kind: result.status === 'CONFIRMATION_REQUIRED' ? 'server' : 'local',
          needsContextReview: result.status === 'CONTEXT_REVIEW_REQUIRED' || Boolean(approved?.needsContextReview) });
        return 'confirmation';
      }
      if (result.status !== 'SAVED' || !result.note) throw new Error('Save was not confirmed. Your draft is preserved.');
      request.current = null; setReview(null); onSaved(result.note); return true;
    } catch (error) {
      onError?.(error.code === 'CONFLICT' ? 'This note changed elsewhere. Your draft is preserved. Copy your changes before reopening the saved visit from Patients.' : error.message);
      return false;
    } finally { pending.current = false; setBusy(false); }
  };
  return { save: () => save(), confirm: value => save(value), review: review?.key === draftKey ? review : null, cancelReview, busy };
}
