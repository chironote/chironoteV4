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

`writeClipboardText` lives in `src/services/nativePlatform.js`. It uses the Capacitor clipboard plugin inside the wrapper and the browser Clipboard API on the website.

## Toolbar Behavior

`ClipboardButtons` calls parent-provided handlers. The `New Note` button calls `toggleRecordingPopup('conversation')`, while the microphone button calls `startDictation()` and derives its loading/recording presentation directly from props.

## Maintenance Notes

- `Clipboard.jsx` creates a hidden measurement div with id `soap-measure-div`; keep cleanup intact if changing positioning.
- Dictation locks textarea changes while transcription is active and shows a green caret at the live insertion point. The field remains focusable so browsers render the caret.
- Toolbar CSS is partially inline via `style jsx`; check both component code and global CSS before styling changes.
- Keep platform detection out of clipboard components; extend the shared native adapter when clipboard behavior changes.
- The Clipboard uses the shared dashboard panel contract: `12px` shell radius, soft-green `52px` toolbar, `40px` controls, and a `10px` inset clinical-text surface with a green focus ring.
- Preserve explicit accessible names on icon actions and `aria-pressed` on the Smart Editor toggle.
