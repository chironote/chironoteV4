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
const cleanedText = cleanCopyText(sectionText);
navigator.clipboard.writeText(cleanedText);
```

## Toolbar Behavior

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


## Copy cleanup policy — 2026-10-15

Copy actions preserve list prefixes, numbering, blockquote markers, horizontal rules, and literal asterisks/underscores. They remove heading markers and paired bold, italic, strikethrough and inline-code delimiters; links retain visible text without URLs, and outer whitespace is trimmed. Whole-note HTML extraction and SOAP section-body selection remain in place. Copy uses `src/utils/copyText.js`; generated text, display cleanup and history-to-clipboard loading retain their existing `stripMarkdown`/`extractPlainText` behavior. Fenced-code handling retains the legacy cleanup behavior. These copy rules cannot restore markers already removed by the existing display cleanup. Source integration does not publish the website or extension.
