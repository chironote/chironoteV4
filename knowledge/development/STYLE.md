---
type: style-guide
title: "Android patient capture styling"
description: "Approved reusable patient creation row and confirmation pattern for Android."
resource: "../../src/components/Patients/Patients.css"
tags: [android, patient, ui, accessibility]
---

# Android patient capture styling

Preserve the current recording and note layout. Creation is one accessible full-width button: pale green surface, Create New Patient plus typed name, and a darker green + Add affordance at the right. Use the established green/surface/border tokens, result-row height and 8px result spacing. The name flexes with min-width zero and ellipsis so long names cannot expand the row; the full name stays in the button's accessible label and title. The affordance is decorative within the single button.

Typed unselected Start Recording opens the compact Create new patient? confirmation only after the existing duplicate guard. The highlighted panel contains only the name; explanation and two actions are separate. Record without a patient is secondary; Create patient & record is primary green with scoped selectors that override generic patient-form styles. Use 16px compact body/header spacing, viewport-bounded scrolling, visible focus, focus restoration and keyboard trapping. Coarse pointers use at least 48px targets; narrow widths may wrap action labels without overflow. Patient names remain draft state, never analytics or URLs.

## Provenance

Approved web patch dated 2026-10-13, SHA-256 `7A3F5D70055E6CB322D7167099440A31FD44354F9FE6D56ECB44E393100CE05F`, from web prod `65d6f0cf4a8689d3ef53700016f8533a46ff96f9`. Android adapts that task-only patch onto cap-and `7da14c845c0a4c2262389d615450a219d6455c4f`.

- [Picker](../../src/components/Patients/PatientCapturePicker.jsx) and [patient styles](../../src/components/Patients/Patients.css).
- [Recording](../../src/components/Recording/Recording.jsx), [recording styles](../../src/components/Recording/Recording.css), and [dialog](../../src/components/Patients/PatientDialog.jsx).
