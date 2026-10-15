# iPhone upload recovery review

Source candidate only. Repository `chironote/chironoteV4`, isolated worktree
`C:/Users/nikit/.codex/worktrees/43ae/macintosh`, task branch
`codex/ios-upload-recovery`, base `origin/cap-ios` at
`6bf62bd32031d838064aefa45c247a282e0db982`. The host and sibling platform
checkouts were not edited. Git integration is tracked by this task's pull request;
merging source does not publish an iOS build.

## Behavior and scope

- Finalized Blobs stay in the existing in-memory queue through temporary
  network, credential-refresh and service failures. S3 and SQS acknowledgement
  are separate stages. A dispatch retry never uploads the object again after
  confirmed S3 success, including ambiguous SQS responses beyond five minutes.
- Retries keep the same bytes, path, owner, timestamp, settings, visit metadata,
  FIFO group and deduplication ID. This base has no separate recordingJobId or
  chunkId fields; none were added to the backend message contract.
- One worker handles queue attempts. Retries use exponential full jitter with
  a 1-second initial ceiling, 60-second cap and 250ms minimum delay. Online
  events are hints, and timer retries work without them. Persistent
  authorization/validation errors retain visibly blocked work for Retry.
  HTTP400 throttling, expired-token and request-timeout responses remain
  retryable; blocked status/Retry are visible inside the waiting dialog too.
- The upload watchdog measures 120 seconds without advancing bytes, not total
  upload duration. SQS receives an abort signal at 60 seconds. Both cancellation
  paths await SDK promise settlement before retrying; a late cancelled result
  cannot dispatch a discarded recording. A cancellation that never settles
  holds the queue safely rather than starting overlapping attempts. Microphone
  capture still proceeds independently.
  Progress is compared with the preceding SDK event so multipart retries that
  lower the byte count can advance again without a false stall.
- Capture B can start while A is pending, after the WebKit stop transaction
  releases the previous recorder. Record next appointment releases A's waiting
  presentation. Each queue and completion session keeps its own immutable
  capture; discarding B cannot erase or cancel A.
- The smallest completion adaptation creates separate subscription/timer/stream
  state per recording and uses the captured timestamp. A still runs ordinary
  note generation and authoritative saved-note lookup. Its saved note refreshes
  history, while presentation guards prevent it from changing B's clipboard,
  target, controls, spinner or NoSleep. Earlier generation failures show a
  generic earlier-recording error. Existing transcript wait/fallback and note
  generation durations/policy are retained.
- Microphone settings, four-minute chunk rotation, WebKit delayed data/stop
  sequencing, pause/resume/background handling and MP4/WebM labels are retained.

## Changed files

| Files | Purpose |
| --- | --- |
| `src/components/Recording/RecordingManager.jsx` | Retained staged queue, paced retries, progress/abort watchdogs, fresh owner-bound dispatch auth and session-scoped discard. |
| `src/components/Recording/useNoteGeneration.js` | Independent recording completion state, immutable timestamp and current-presentation callback gates. |
| `src/components/Recording/Recording.jsx` | Record next appointment action on the existing waiting views. |
| `src/components/AppShell/MainWorkspace.jsx` | Forward that action. |
| `src/components/AppShell/AuthenticatedApp.jsx` | Pending/blocked status and Retry; background saved-note history refresh without clipboard replacement. |
| `src/components/Recording/RecordingManager.test.js` | Mocked transport, queue identity/order/cancellation and existing WebKit lifecycle coverage. |
| `src/components/Recording/useNoteGeneration.test.jsx` | Multiple-recording completion/presentation isolation and unchanged timeout fallback. |
| `src/components/Recording/Recording.test.jsx` | Next-appointment action during transcript/generation waiting. |
| `src/components/AppShell/PatientClipboardFlow.test.jsx` | Opening next settings detaches prior presentation; background saved-note refresh preserves current clipboard. |
| `src/components/Recording/README.md`, `src/components/AppShell/README.md` | Component ownership and recovery limits. |
| `knowledge/components/recording-lifecycle.md`, `knowledge/architecture/app-shell.md`, `knowledge/architecture/data-integration.md`, `knowledge/operations/mobile-build.md`, `knowledge/log.md` | Affected concept/log maintenance and device gates. |
| This review file | Scope, validation evidence and release limitations. |

## Initial implementation validation evidence

`npm ci` passed with unchanged manifests. Installed Storage 6.7.11 provides
`onProgress({ transferredBytes })`, `cancel()` and a rejecting `result` promise;
SQS 3.777.0 accepts `send(command, { abortSignal })`. Verified in installed SDK
source rather than inferred from newer documentation. SDK internal retry
behavior remains enabled; the queue does not multiply concurrent attempts.

The full candidate suite passed **36 suites / 193 tests**, including
recording/auth/patient/session regressions. The first focused run's only failure
used one mock stream for both microphones; the fixture now creates independent
streams. Review then added HTTP400 throttling/credential-expiry retry coverage,
SDK progress-reset coverage and a blocked-status check inside the dialog.
The affected final suites and build are revalidated after those final edits;
their results are recorded below.

The initial build lacked the ignored `src/amplifyconfiguration.json`. A build
using a temporary empty `{}` configuration passed; the fixture was removed.
This is compilation evidence, not real configuration/runtime verification.
The OKS validator passed 10 concepts and `git diff --check` passed for that
candidate. Final amended-source evidence follows the bounded revalidation.

Final amended-source validation passed:

- `CI=true npm test -- --watchAll=false --runInBand --runTestsByPath src/components/Recording/RecordingManager.test.js src/components/Recording/useNoteGeneration.test.jsx src/components/Recording/Recording.test.jsx src/components/AppShell/MainWorkspace.test.jsx`: **4 suites / 49 tests**. The broader 193-test result precedes only the final scoped classifier/progress/status amendments; it was not redundantly repeated.
- `npm run build` with CI unset and the temporary ignored empty Amplify configuration: **passed with warnings**. Fixture SHA256 `E3566B3A06430868D71E9287DFD6C6C520A3DA027AABEA01951D407EE131DC2F`; removed and verified absent afterward. No host configuration was copied.
- `uv run --with pyyaml --with markdown-it-py python C:/Users/nikit/.codex/skills/healtech-oks/scripts/validate_oks.py C:/Users/nikit/.codex/worktrees/43ae/macintosh`: **passed**, 10 concepts, one category level. The lead reviewed affected prose against source; structural validation alone cannot prove source freshness.
- `git diff --check`: **passed**.

That implementation's tested source is base `6bf62bd32031d838064aefa45c247a282e0db982`
plus `amended-final.diff` (SHA256
`DD29F9ADCE34E41BAE623629FF2551449149137C6491F41A378470CCF86142F1`).
`amended-final-hashes.csv` and `amended-final-untracked/` identify all 16 changed
files, including the new test/review document. All hashes stayed unchanged
during execution. Only this review document was updated afterward with these
results; runtime/test source and knowledge files retain the tested bytes.

Build warnings remain in existing source: unused Recording userSubscription;
unused RecordingManager React/useCallback/isTranscriptCompleted and existing
background/unmount hook dependencies; other untouched source lint warnings,
stale Browserslist data and CRA's undeclared Babel plugin warning. The new
queue listener dependency warning was removed. These were not treated as a
clean lint pass or repaired as unrelated cleanup.

Logs: `final-candidate-tests.log` (full suite), `amended-final-tests.log`
(final affected tests), `final-build-amended.log`,
`amended-final-oks-validator.log` and `amended-final-diff-check.log`.

## Review corrections before Git integration

The requested adversarial review found and corrected these client bugs:

- A credit response arriving after B started could call generic discard and
  cancel B. Credit results now carry an accepted session/request guard, and
  discard can cancel an older session's remaining work without touching B.
  Late A denials are still honored and reported as earlier-recording errors;
  no-op Starts neither run another lookup nor invalidate A's accepted check.
  Closing during startup cancels its pending acquisition. Credit-denial policy
  is unchanged.
- Stop between WebKit dataavailable and onstop could submit only a regular
  chunk. The stop transaction now holds the Blob through onstop and commits its
  final intent once, preserving delayed events and exact audio bytes. The UI
  shows the brief microphone flush/start state rather than accepting a no-op
  Start; upload backlog never gates capture.
  Equivalent final-event fencing prevents non-iOS paths within this client
  from losing A's delayed final when the next-appointment action is used.
- An indefinitely pending auth read could pin the queue. A 60-second deadline
  fences that read; late results cannot upload/dispatch or update the queue.
  Auth has no SDK abort handle, so SDK work itself can still finish later.
- A fulfilled S3 task racing watchdog cancellation was incorrectly retried as
  an upload. Fulfilment now advances to dispatch-pending. Dispatch-only retries
  obtain credentials once, and acknowledged items cannot dispatch again.
- Opening B settings before its capture started left A's presentation active.
  The shell now hands off ownership when opening settings. NoSleep release has
  its own successful-capture owner, so it neither leaks when B never starts nor
  lets A disable B's wake lease.

Regression tests cover those interleavings. A mock also models accepted SQS
submission followed by a lost response and a retry beyond five minutes: IDs
and S3 bytes remain unchanged, but SQS can deliver a duplicate after FIFO
deduplication expires. Exactly-once backend/billing guarantees remain untested.

Post-review validation passed **36 suites / 217 tests**, production web
compilation with the temporary ignored empty Amplify configuration, OKS
validation (10 concepts) and `git diff --check`. The fixture was removed and
all 17 changed-file hashes stayed stable throughout execution. Build warning
comparison found no new warnings; existing lint/CRA and React test deprecation
warnings remain. Initial implementation counts and diff hashes above are
historical, not final review-fix evidence.

Final review-fix logs and before/after source hash snapshots are at
`C:/Users/nikit/.codex/tmp/ios-upload-recovery/review-final-20261015T230919563Z/`.
Only this evidence summary and the knowledge log were updated after execution;
runtime/test source retains the validated bytes. The primary iOS checkout has
unrelated dirty work and was left unchanged under the original task boundary.

External local execution logs/snapshots:
`C:/Users/nikit/.codex/tmp/ios-upload-recovery/`. Fixtures contain fictional
identities and synthetic bytes. No real audio or real-account integration is
used. Client tests establish identity preservation and dispatch behavior,
not deployed backend duplicate/billing protection or completed transcription.

## Remaining release gates and limits

Mac dependency sync, CocoaPods/Xcode compilation, signing and installed-iPhone
checks were not performed in this Windows worktree. Physical testing must cover
slow advancing WiFi, a true stall, disconnect/reconnect, two-network handoff,
pause/resume/background/foreground, delayed final events and recording the next
appointment while the earlier one completes. Verify A appears in history with
A's patient/settings, B keeps capturing and its clipboard/controls remain
unchanged, and discarding B preserves A. Network switching is a plausible
trigger from the report, not an established root cause.

The process must stay alive. No disk/IndexedDB/native audio persistence or
restart recovery was added. In-memory retention cannot guarantee zero loss.
S3/SQS acknowledgement does not prove all server transcription has completed;
the known backend completeness/API issue remains outside scope. No backend,
AWS/IAM, schema, billing, audio-format or native identity changes were made.
No upload-backlog recording blockade, deploy or store submission is part of
this work. The subsequent user request authorizes push/PR merge into `cap-ios`,
while publishing remains prohibited. Public builds lag this development candidate;
this is not a production-readiness claim.
