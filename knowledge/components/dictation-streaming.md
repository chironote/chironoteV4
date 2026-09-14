---
type: streaming-component
title: "Live Dictation Streaming"
description: "How browser audio becomes ordered AssemblyAI turns, enters the clipboard, accounts for usage, and cleans up native resources."
resource: "../../src/components/Recording/Dictation.jsx"
tags: [dictation, assemblyai, audio-worklet, websocket, microphone]
---

# Live Dictation Streaming

Dictation warms an AssemblyAI token from the configured token Function URL and
loads the authenticated user's subscription. Before capture it checks available
hours, asks for microphone consent, and prepares a 16 kHz mono Web Audio context.
An embedded AudioWorklet converts Float32 samples to clamped Int16 frames and
emits 100 ms byte chunks into a `ReadableStream` connected to AssemblyAI's
`StreamingTranscriber`.

Transcriber `turn` events are stored by `turn_order`, sorted, joined with spaces,
and written into both local transcription state and the app clipboard. Token
refresh is scheduled before expiry. On stop, the component closes the stream,
AudioWorklet, AudioContext, media tracks, transcriber, NoSleep, and timers, then
charges usage as elapsed seconds divided by 3,600 hours. Component unmount and
failed initialization follow the same cleanup path.

The controller exposes loading, connection, transcription, queue, and credit
popup state to `App.jsx`; the UI prevents conflicting clipboard edits while a
dictation connection is initializing or active. The AssemblyAI service and token
Lambda are external boundaries, so this repository documents the caller and
wire assumptions only.

## Provenance

- [Dictation controller](../../src/components/Recording/Dictation.jsx)
- [Dictation context](../../src/components/Recording/Dictation.md)
- [Credit limit popup](../../src/components/Recording/CreditLimit.jsx)
- [Subscription queries](../../src/graphql/queries.js)
- [Subscription mutations](../../src/graphql/mutations.js)
- [Application context](../../Context.md)

The current component outranks the longer design-style `Dictation.md` when they
describe different behavior.
