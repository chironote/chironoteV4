---
type: component-readme
title: "Clipboard Components"
description: "Clipboard workspace behavior, SOAP section tools, dictation integration, and maintenance guidance."
resource: "../../src/components/Clipboard/README.md"
tags: [chironote, component, clipboard]
---


> Source: [`README.md`](../../src/components/Clipboard/README.md)

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

`writeClipboardText` uses the Capacitor clipboard plugin inside the native wrapper and the browser Clipboard API on the website. Platform detection stays centralized in `src/services/nativePlatform.js`.

## Toolbar Behavior

`ClipboardButtons` calls parent-provided handlers. The `New Note` button calls `toggleRecordingPopup('conversation')`, while the microphone button calls `startDictation()` and derives its visual state directly from props.

## Maintenance Notes

- `Clipboard.jsx` creates a hidden measurement div with id `soap-measure-div`; keep cleanup intact if changing positioning.
- Dictation locks textarea changes while transcription is active and shows a green caret at the live insertion point. The field remains focusable so browsers render the caret.
- Toolbar CSS is partially inline via `style jsx`; check both component code and global CSS before styling changes.
- Keep platform detection out of clipboard components; extend the shared native adapter when clipboard behavior changes.
- The Clipboard matches the production visual contract: `12px` shell, standard panel shadow, soft-green `52px` toolbar, and a `10px` inset textarea with `20px` padding.
- Icon actions have accessible names; the Smart Editor toggle exposes pressed state.

## Provenance

Derived from [`README.md`](../../src/components/Clipboard/README.md), [`Clipboard.jsx`](../../src/components/Clipboard/Clipboard.jsx), and [`nativePlatform.js`](../../src/services/nativePlatform.js).

