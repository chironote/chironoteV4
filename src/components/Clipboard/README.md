# Clipboard Components

Saved patient visits share this editor. The toolbar has an Edit/Save divider and enables Save on installed native phones or desktop web; mobile web remains local-only. The shell owns exact identity/version, draft guards and diagnosis confirmation. Saved-note drops carry only an opaque timestamp and load the authoritative record; ordinary text drops remain local text. Native copy still uses `writeClipboardText`. Coarse-pointer toolbar targets are at least 48px.

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

`ClipboardButtons` calls parent-provided handlers and only owns the active/loading visual state for dictation:

```js
setIsDictationActive(isDictationLoading || isTranscribing || isWebSocketConnecting);
```

The `New Note` button calls `toggleRecordingPopup('conversation')`, while the microphone button calls `startDictation()`.

## Maintenance Notes

- `Clipboard.jsx` creates a hidden measurement div with id `soap-measure-div`; keep cleanup intact if changing positioning.
- Dictation locks textarea changes while transcription is active and shows a green caret at the live insertion point. The field remains focusable so browsers render the caret.
- Toolbar CSS is partially inline via `style jsx`; check both component code and global CSS before styling changes.
- The workspace keeps one white clipboard canvas. The textarea begins directly after the SOAP rail with a 12px top inset; its border, rather than a second colored surface, defines the writing sheet on desktop and mobile.
- Keep platform detection out of clipboard components; extend the shared native adapter when clipboard behavior changes.

Compact layouts up to 900px wrap toolbar controls instead of clipping Save. Edit and its Save divider/button remain a single adjacent group, and the Smart Editor icon stays visible. Section-copy controls retain their established header-aligned vertical rail, widened to fit 44px touch targets without clipping.
