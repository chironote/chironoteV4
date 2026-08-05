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
- The Clipboard now matches the history panel's visual language: a `12px` shell, standard panel shadow, soft-green `52px` toolbar, and `10px` inset textarea with `20px` padding.
- Icon actions have accessible names; the Smart Editor toggle also exposes pressed state.

## Visual Style Reference

Follow [Panels, editors, and long-form text](../development/STYLE.md#panels-editors-and-long-form-text), [Buttons and controls](../development/STYLE.md#buttons-and-controls), and [Forms](../development/STYLE.md#forms) when changing the clipboard, its toolbar, or Smart Editor handoff states.

## Provenance

Derived from [`README.md`](../../src/components/Clipboard/README.md).

