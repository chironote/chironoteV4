// In-memory only: a draft never enters browser storage or navigation state.
const guards = new Set();
export const hasUnsavedDraft = () => [...guards].some(guard => guard.dirty());
export function registerDraftGuard(guard) {
  guards.add(guard);
  return () => guards.delete(guard);
}
export async function leaveDrafts(action) {
  for (const guard of [...guards]) {
    if (guard.dirty() && !await guard.confirm()) return false;
  }
  await action?.();
  return true;
}
