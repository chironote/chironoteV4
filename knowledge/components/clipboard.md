---
type: component-readme
title: "Clipboard Components"
description: "Clipboard workspace behavior, SOAP section tools, dictation integration, and maintenance guidance."
resource: "../../src/components/Clipboard/README.md"
tags: [chironote, component, clipboard]
---


> Source: [README.md](../../src/components/Clipboard/README.md)

# Clipboard Components

The clipboard is also the sole saved-note editor. Patients and saved-note drops fetch the exact server record, preserving its identity/version. Save supports installed Android phones/tablets and desktop web, independently of Smart Editor with confirmation for explicit diagnosis changes. Mobile web retains its prior Save gate. Phone toolbar targets are 44px below 390px viewport width and 48px at wider phone widths; native tablet controls use a consistent 44px minimum. Native copy remains in the shared adapter; drafts stay memory-only. See [patient notes](../architecture/patient-notes.md).

This folder owns the central clipboard panel and the toolbar above it. The clipboard is the main text handoff point between recording, dictation, note history, smart edits, and copy actions.

## Files

- `Clipboard.jsx` renders the editable textarea, drag/drop behavior, and floating SOAP section-copy buttons.
- `ClipboardButtons.jsx` renders toolbar actions for new notes, dictation, copy, clear, and the desktop web Smart Editor toggle.

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

Phones keep the full green + New Note label and the Dictate, Copy and Clear actions.
Save remains present only for a relevant saved note and does not depend on Edit.
Smart Editor is absent throughout installed Android apps at all sizes and on phone web layouts; desktop web retains it. The shared predicate
uses viewport width up to 600px or valid screen dimensions whose shortest side is
up to 600px. Wide short desktop windows and tablet keyboard heights alone do not
trigger phone behavior. Targets are 44px below 390px viewport width and 48px above,
with deliberate wrapping rather than clipping. Phone dividers are hidden.
Notes without recognized SOAP headers retain balanced editor gutters; SOAP notes
retain their section-copy rail. Phone text remains 16px with 12px padding, and
saved-note patient/visit labels wrap with explicit spacing. These are local source
changes; installed-device acceptance and publication remain separate.

## Provenance

Derived from [README.md](../../src/components/Clipboard/README.md), [Clipboard.jsx](../../src/components/Clipboard/Clipboard.jsx), [workspace styling](../../src/App.css), and [nativePlatform.js](../../src/services/nativePlatform.js), and [phone layout detection](../../src/hooks/usePhoneLayout.js).


Native Clipboard controls share 14px semibold typography and a 44px minimum target across phones/tablets; phone layout expands targets to 48px where space permits. Native icon controls use transparent surfaces with established hover, dirty Save and active dictation states.
