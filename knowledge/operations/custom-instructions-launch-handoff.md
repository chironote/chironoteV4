---
type: operational-contract
title: "Custom Instructions Launch Handoff"
description: "Authoritative production state, remaining deployment gates, and bounded launch proof for Custom Instructions."
resource: "../../src/services/customInstructions.js"
tags: [custom-instructions, launch, backend, lambda]
---

# Custom Instructions Launch Handoff

## Authoritative runtime

The production note-generation Lambda is `transcriptToNoteV2`. Every supported Web,
Android, browser-extension, macOS, and other installed client uses its existing
streaming Function URL. The source repository is
`chironote/lambda-transcript2note`.

The reviewed Custom Instructions consumer source is merged into that repository's
`main` branch and passed 52/52 local tests. It has not been uploaded to AWS.
Read-only verification on 2026-08-17 found production V2 Active/Successful on Node.js
24, revision `44bdde9f-1ef9-4e98-ab6d-c8b1af67314f`, and code hash
`R3SX5dCkCv+tPqvjOHW608EkSvTQBsagIUyUNPMgDSk=`.

No Lambda code, environment variable, IAM policy, queue trigger, hosting asset,
Function URL, or feature flag changed during the source work. Embedded note prompts
remain effective in production.

## Completed work

- V4 Settings UI and authenticated AppSync query/start/disable operations are merged.
- PromptProfiles, the encrypted FIFO compile queue/DLQ, MetaPrompter worker mode,
  least-privilege MetaPrompter role, resolvers, and alarms are installed.
- The note consumer verifies the Cognito access-token subject, ignores body owner
  overrides, reads one owner profile, validates the complete versioned schema, and
  falls back to embedded defaults on every invalid or unavailable state.
- Custom recipes remain user-prompt material; system prompts are unchanged.
- The runtime flag defaults off.

## Remaining launch gates

1. Capture and verify the current `transcriptToNoteV2` live ZIP and configuration as
   rollback evidence.
2. Build/package the merged Lambda `main` branch for the exact Node.js 24 V2 runtime.
3. Upload it to `transcriptToNoteV2` with revision locking while the runtime flag
   remains off.
4. Verify the deployed hash, preserved configuration, response streaming, error
   sentinel, retry/persistence behavior, and default note generation.
5. Attach the MetaPrompter FIFO queue event-source mapping with reviewed concurrency
   and failure behavior.
6. Run one short authenticated synthetic compilation and stop if it does not reach
   READY or an understood terminal FAILED state.
7. After READY, run one synthetic current-client note and prove that the owner profile
   is consumed while invalid/missing/disabled profiles still select defaults.
8. Enable runtime/frontend flags and publish hosting only with separate owner approval.

The provider-cost cap for the launch proof is two operations: one compilation and one
synthetic note. Use no patient data.

## Current safe state

Waiting is safe. The frontend flag remains off, the note runtime flag remains off or
unconfigured, and the queue has no worker trigger. Git merge is not AWS deployment.

## Provenance

- Owner runtime correction on 2026-08-17
- Read-only `transcriptToNoteV2` AWS configuration verification on 2026-08-17
- `chironote/lambda-transcript2note` knowledge and tests
- Airtable Workboard record `recNAvJXzjjGURszg`

