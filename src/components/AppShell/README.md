# Native application shell

The shell and Clipboard section receive `clipboard-native-layout` independently of phone classification, aligning native control typography and minimum touch sizes without applying phone geometry to tablets.

`AuthenticatedApp` owns the principal-keyed clinical workspace, exact saved-note identity/version, in-memory clipboard drafts, recording, dictation and popup state. `MainWorkspace` renders the grouped props. `useNotesHistory` loads and paginates owner history, omits deleted markers, keeps the latest 100 non-empty notes, subscribes to updates and refreshes manually, on visibility and on native foreground. Failed refresh preserves history with an inline retry message; older fetch completions are ignored. Foreground also expires temporary PDF files.

`src/App.jsx` uses a data router with DraftRouteGuard while retaining the existing AuthContainer/sign-in flow. Home, Patients, Billing and Settings are protected. Billing renders the existing native Account usage view; account/pricingplans are compatibility redirects to it. No Stripe checkout, marketing scripts, user analytics or milestone writes are included. Feedback is a controlled modal with a compatibility route.

Patients selections, source-note links, popup clipboard actions and saved-history drops retrieve exact saved records and use the shared draft guard before opening the clipboard. Save is enabled on Capacitor phones/tablets and fine-pointer desktop; browser-mobile retains local editing. useClipboardSave binds the loaded version and preserves failed/conflicting drafts. Required diagnosis/context confirmation is inline. Reassignment refreshes matching clean clipboard identity; dirty drafts retain their original version. Confirmed deletion clears matching patient history, popup and clipboard.

RecordingManager remains the iOS lifecycle implementation; the shell receives generation/error/saved-note callbacks without altering WebKit stop ordering. Dictation snapshots the selected textarea range before starting and applies revised transcripts through pure dictationInsertion helpers. Whole-note and section copies use nativePlatform. Flat legacy Clipboard/ContentPopup/EditPanel/ErrorBanner modules are compatibility re-exports, not additional editors.

Audio submission status exposes pending/blocked in-memory work and Retry. Recording's Record next appointment action releases only the waiting presentation. Earlier recordings finish their own generation and authoritative saved-note lookup, refresh history and cannot overwrite the current clipboard/target or close the new recording popup. The manager fences these presentation callbacks by recording ownership; the shell honors saved-note `isCurrent` metadata separately from history refresh.

Opening fresh recording settings hands off presentation ownership immediately, including while an earlier note is already streaming and B has not started. NoSleep release is independently scoped to the successfully started recording. The workspace forwards the capture-session getter and microphone startup/finishing state so stale credit checks cannot cancel the next capture and rejected Starts do not run credit lookups.

Source provenance: imported shared workflow from web prod `142383e`; native integration preserves cap-ios `2326d34`. Tests cover saved identity, draft navigation, diagnosis changes and native route restrictions. Changes to this folder require updating this README and the app-shell knowledge concept.

The shared phone predicate in `src/hooks/usePhoneLayout.js` persists through orientation changes and never uses viewport height. Smart Editor availability is separate: `AuthenticatedApp` permits it only outside native apps and phone web layouts. Fresh native/phone checks guard the toggle and Ctrl+B; unavailable state closes the panel while retaining edit text. MainWorkspace omits EditPanel on native phones/tablets and phone web, keeping native Clipboard Save independent and preserving versioned patient guards. Desktop web retains editor access. Phone styling remains based only on the phone predicate, preserving tablet geometry.

### Recovered saved results

The current V4 Capacitor client's per-capture sessions remain independent. A
background recovered completion refreshes history without changing the foreground
clipboard. Foreground completion installs the exact saved body/version as its
clean editable baseline. Opening another Patients visit is held while generation
owns the clipboard. No native project or bridge change is included.

Saved completion resets the raw body and version together; preview Markdown formatting never defines the persisted edit baseline.
