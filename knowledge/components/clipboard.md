---
type: component-readme
title: "Clipboard Components"
description: "Clipboard workspace behavior, SOAP section tools, dictation integration, and maintenance guidance."
resource: "../../src/components/Clipboard/README.md"
tags: [chironote, component, clipboard]
---


> Source: [README.md](../../src/components/Clipboard/README.md)

# Clipboard Components

The clipboard is also the sole saved-note editor. Patients and saved-note drops fetch the exact server record, preserving its identity/version. Save supports installed phones and desktop web, with a divider after Edit and confirmation for explicit diagnosis changes. Mobile web retains its prior Save gate. Coarse-pointer toolbar targets are 48px. Native copy remains in the shared adapter; drafts stay memory-only. See [patient notes](../architecture/patient-notes.md).

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

`writeClipboardText` uses the Capacitor clipboard plugin inside the native wrapper and the browser Clipboard API on the website. Platform detection stays centralized in `src/services/nativePlatform.js`.

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

## Phone layout

At widths up to 600px, New Note uses its accessibly labeled plus button and the
toolbar fits 48px actions in one row, including adjacent Edit/Save. Dividers are
hidden on phones. Notes without recognized SOAP headers collapse the otherwise
empty section-copy rail and have balanced editor gutters; SOAP notes retain the
rail even when individual section buttons scroll out of view. Phone text is 16px
with 12px padding. Saved-note patient and visit labels wrap with explicit spacing.
These rules correct the oversized toolbar and empty gutter
reported after Internal 32; browser previews do not establish device acceptance.

## Provenance

Derived from [README.md](../../src/components/Clipboard/README.md), [Clipboard.jsx](../../src/components/Clipboard/Clipboard.jsx), [workspace styling](../../src/App.css), and [nativePlatform.js](../../src/services/nativePlatform.js).

