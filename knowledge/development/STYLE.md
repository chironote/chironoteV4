---
type: style-guide
title: "Android clinical interface styling"
description: "Established patient capture, Settings, dialog and touch-target conventions for Android."
resource: "../../src/components/Patients/Patients.css"
tags: [android, patient, ui, accessibility]
---

# Android clinical interface styling

Preserve the current recording and note layout. Creation is one accessible full-width button: pale green surface, Create New Patient plus typed name, and a darker green + Add affordance at the right. Use the established green/surface/border tokens, result-row height and 8px result spacing. The name flexes with min-width zero and ellipsis so long names cannot expand the row; the full name stays in the button's accessible label and title. The affordance is decorative within the single button.

Typed unselected Start Recording opens the compact Create new patient? confirmation only after the existing duplicate guard. The highlighted panel contains only the name; explanation and two actions are separate. Record without a patient is secondary; Create patient & record is primary green with scoped selectors that override generic patient-form styles. Use 16px compact body/header spacing, viewport-bounded scrolling, visible focus, focus restoration and keyboard trapping. Coarse pointers use at least 48px targets; narrow widths may wrap action labels without overflow. Patient names remain draft state, never analytics or URLs.

Recording options retain their labels and placement. Selected new patients show Exam Layout checked with native disabled semantics, a grayscale checkbox and system GrayText label. Unassigned patients retain the editable control; existing patients retain Re-Exam. PI stays in its established position. The typed-name confirmation contains no duplicate options. Existing 44px/48px target rules and label associations remain in force.

## Settings and preference dialogs

Keep the existing Settings card composition, product green/surface/border tokens, 32px/38px page heading, 24px/30px card headings and 16px form controls. Lifetime hours, Custom Instructions and optional Signature retain their current order. Custom Instructions uses the shared ProductDialog with viewport-bounded internal scrolling, visible focus, focus trapping/restoration and reduced-motion behavior. The portal's textarea uses border-box sizing independently of the Settings page so its padding cannot clip the right edge. At narrow widths, stack form actions without clipping labels; Settings actions and dialog close controls use at least 48px targets on coarse pointers. Status uses text and live announcements alongside the badge; approximate progress must not imply server-confirmed readiness. Keep previous active instructions/defaults explicit during compilation and failure.

## Provenance

Approved web patch dated 2026-10-13, SHA-256 `7A3F5D70055E6CB322D7167099440A31FD44354F9FE6D56ECB44E393100CE05F`, from web prod `65d6f0cf4a8689d3ef53700016f8533a46ff96f9`. Android adapts that task-only patch onto cap-and `7da14c845c0a4c2262389d615450a219d6455c4f`.

- [Picker](../../src/components/Patients/PatientCapturePicker.jsx) and [patient styles](../../src/components/Patients/Patients.css).
- [Recording](../../src/components/Recording/Recording.jsx), [recording styles](../../src/components/Recording/Recording.css), and [dialog](../../src/components/Patients/PatientDialog.jsx).
- [Settings](../../src/components/Settings/Settings.jsx), [Settings styles](../../src/components/Settings/Settings.css), [custom-instructions dialog](../../src/components/Settings/CustomInstructionsDialog.jsx) and [shared dialog styles](../../src/components/Dialog/ProductDialog.css), adapted from the current iOS Custom Instructions flow on 2026-10-15 while retaining Android's established card order and tokens.
