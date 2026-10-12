# Clipboard Components

Saved patient visits share this editor. The toolbar keeps Save independent from Smart Editor and enables Save on installed native phones or desktop web; mobile web remains local-only. The shell owns exact identity/version, draft guards and diagnosis confirmation. Saved-note drops carry only an opaque timestamp and load the authoritative record; ordinary text drops remain local text. Native copy still uses `writeClipboardText`. Coarse-pointer toolbar targets are at least 48px.

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

Phones keep the full green + New Note label, followed by Dictate, Copy, Clear and context-dependent Save. Smart Editor is unavailable throughout installed Android apps, including phones and tablets, and on phone web layouts. Desktop web retains Smart Editor. The shared phone predicate uses viewport width up to 600px or a valid screen shortest dimension up to 600px. Clipboard controls use 44px targets below 390px, then 48px targets, with deliberate wrapping if needed; dividers are hidden. Save remains available for saved notes without an Edit control. Notes without recognized SOAP headers have no section rail and use balanced editor gutters. SOAP notes retain the established header-aligned section-copy rail; scrolling does not collapse it. Phone note text is 16px with 12px padding.

Native Clipboard controls share 14px semibold typography and a 44px minimum target across phones/tablets; phone layout expands targets to 48px where space permits. Native icon controls use transparent surfaces with established hover, dirty Save and active dictation states.
