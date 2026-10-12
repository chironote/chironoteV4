# Clipboard Components

This folder owns the central clipboard panel and the toolbar above it. The clipboard is the main text handoff point between recording, dictation, note history, smart edits, and copy actions.

## Files

- `Clipboard.jsx` renders the editable textarea, drag/drop behavior, and floating SOAP section-copy buttons.
- `ClipboardButtons.jsx` renders toolbar actions for new notes, dictation, copy, clear, and smart editor toggle.

## Clipboard Behavior

`Clipboard` is controlled by parent state from `AppShell/AuthenticatedApp.jsx`. It accepts `clipboardContent` and `setClipboardContent`, then handles local UI details such as drag-over state and SOAP button positioning.

The SOAP buttons look for section headers in the current text:

```js
const sections = {
  'S': 'Subjective:',
  'O': 'Objective:',
  'A': 'Assessment:',
  'P': 'Plan:',
  'T': 'Treatment:'
};
```

Before copying a section, markdown is stripped:

```js
const cleanedText = stripMarkdown(sectionText);
writeClipboardText(cleanedText);
```

## Toolbar Behavior

Native Clipboard controls share 14px/600 typography, 24px line height, 8px radius and a 44px minimum target across iPhone/iPad and Android. Phone rules raise targets to 48px where space permits; tablet insets and New Note width stay on their existing layout. Native icon surfaces are transparent with shared hover and dirty-Save feedback.

`ClipboardButtons` calls parent-provided handlers and only owns the active/loading visual state for dictation:

```js
setIsDictationActive(isDictationLoading || isTranscribing || isWebSocketConnecting);
```

The `New Note` button calls `toggleRecordingPopup('conversation')`, while the microphone button calls `startDictation()`.

## Maintenance Notes

- `Clipboard.jsx` creates a hidden measurement div with id `soap-measure-div`; keep cleanup intact if changing positioning.
- Dictation locks textarea changes while transcription is active and shows a green caret at the live insertion point. The field remains focusable so browsers render the caret.
- Toolbar CSS is partially inline via `style jsx`; check both component code and global CSS before styling changes.
- The Clipboard uses the shared dashboard panel contract: `12px` shell radius, soft-green `52px` toolbar, `40px` desktop actions, and a `10px` inset clinical-text surface with a green focus ring.
- Preserve explicit accessible names on icon actions and `aria-pressed` on the Smart Editor toggle.

## Patient UI correction

Desktop patient-note Save is an icon-only action immediately after Smart Editor in the existing toolbar. Its accessible title/label, dirty highlight, disabled state and live saving feedback come from AppShell. No separate bottom Save container is rendered; versioned save and review gates remain in the patient service workflow.

Smart Editor and Save are separated by the existing `toolbar-divider` style, rendered only when Save is visible.

History drags include a saved-note timestamp in a custom drag format alongside plain text. With patient features enabled, `Clipboard` delegates saved-key drops to AppShell, which reloads the authoritative note and runs the same guarded opening as Patients selection. External text retains direct replacement behavior and remains an edit of an already loaded saved note. Drops cannot change text during saving, generation or active dictation.

Native copy uses services/nativePlatform and propagates failures without logging clinical content. The same versioned Save control and divider appear on Capacitor phones/tablets; mobile browsers keep the prior visibility gate. Flat parent modules are compatibility re-exports.

Phone layout uses `src/hooks/usePhoneLayout`: viewport width at most 600px or a valid screen shortest CSS dimension at most 600px, including phone landscape. Viewport height never identifies a phone. The toolbar keeps a complete green `+ New Note` label (120–180px), then Dictate, Copy, Delete and an independent Save when applicable. Targets are 44px with 6px gaps below 390px, then 48px with 8px gaps. Smaller layouts deliberately wrap. Smart Editor is absent throughout native iPhone/iPad apps and in phone web layouts; desktop web retains adjacent Edit/Save. Save is independent wherever Smart Editor is unavailable, with no empty editor group/divider. Redundant phone dividers are hidden. Notes without recognized SOAP headers have no section rail and use balanced editor gutters. SOAP notes retain the established header-aligned section-copy rail; scrolling does not collapse it. Phone note text is 16px with 12px padding. `ios.css` overrides native phone toolbar insets and boxed icon surfaces to match Android while preserving native styles elsewhere.
