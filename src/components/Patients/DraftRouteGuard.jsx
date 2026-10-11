import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';
import { hasUnsavedDraft, leaveDrafts } from './draftNavigation';

export default function DraftRouteGuard() {
  const blocker = useBlocker(() => hasUnsavedDraft());
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    let active = true;
    leaveDrafts().then(allowed => {
      if (active) allowed ? blocker.proceed() : blocker.reset();
    });
    return () => { active = false; };
  }, [blocker]);
  return null;
}
