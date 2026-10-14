---
type: design-contract
title: "iPhone patient capture styling"
description: "Approved reusable creation row and confirmation patterns for the iOS React WebView."
resource: "../../src/components/Patients/Patients.css"
tags: [ios, styling, patient-capture, accessibility]
---

# iPhone patient capture styling

Keep the existing recording layout, focus and typing workflow. The approved Create New Patient option is one full-width accessible button: pale green surface, typed name, darker green + Add affordance at right. Match result-row height with 8px spacing; no extra empty-result gap. Bound the row width, ellipsize long names and retain the full name in its accessible label/title. Use the existing green, border, pressed and text tokens; touch targets remain at least 44px (48px on coarse pointers).

Typed but unselected names are checked across all normalized-name result pages before the compact Create new patient? confirmation. Its highlighted panel contains only the name. Show the explanation “Create a new patient with this name, or record without linking it to a patient.” and the actions Record without a patient / Create patient & record. Scope primary green styles above generic patient-form rules. Stack actions on small phones; bound height and respect safe areas in landscape. Preserve keyboard focus trapping, Escape/close and visible focus styles. Closing retains the typed draft.

The app currently supplies a light palette even under system dark appearance; do not invent a second theme for this scoped change. Validate the rendered palette under both system preferences, reduced motion, enlarged text, phone portrait/landscape and tablet. Native Dynamic Type, VoiceOver, keyboard and physical microphone/background acceptance remain device checks.

Prepare provisional identity before confirmation. The final recording choice invokes microphone capture synchronously before async subscription checks. Unassigned clears identity, name, injury date and initial/re-exam intent. Persistence stays in the existing capture/save service; no extra create request. Retain the iOS secure randomId helper and RecordingManager stop/lifecycle implementation.

## Provenance

- Approved web patch dated 2026-10-13, SHA256 `7A3F5D70055E6CB322D7167099440A31FD44354F9FE6D56ECB44E393100CE05F`; narrow adaptation from web prod `65d6f0c` onto iOS cap-ios `6cb26ee`.
- [Patient picker](../../src/components/Patients/PatientCapturePicker.jsx) and [styles](../../src/components/Patients/Patients.css).
- [Recording confirmation](../../src/components/Recording/Recording.jsx) and [styles](../../src/components/Recording/Recording.css).
- [Secure identity](../../src/utils/randomId.js) and [recording lifecycle](../components/recording-lifecycle.md).
