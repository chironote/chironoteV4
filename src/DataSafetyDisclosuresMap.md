# ChiroNote Data Safety Disclosures Map

This document enumerates every instance of data access, collection, transmission, storage, and sharing that occurs within the ChiroNote Capacitor app codebase. Each entry lists the relevant code location, purpose, storage/retention details, and disclosure notes for Google Play Data Safety. Items marked with **(NEEDS USER ATTENTION)** require confirmation or additional detail from the product/security team.

Assumptions:
- All Protected Health Information (PHI) is encrypted in transit (HTTPS, WebSockets over TLS) and at rest (AWS-managed encryption for S3, DynamoDB, Cognito, Lambda environment variables) per user guidance.
- The native Capacitor shell does not initialize Google Analytics and does not render the web cookie-consent flow (`src/index.js`, `src/App.jsx`). The browser build retains its consent-gated analytics implementation.

---

## Authentication & Identity Data
- **Credentials (email, password)**
  - **Code Locations:** `src/components/AppShell/AuthWrapper.jsx` and the AWS Amplify Authenticator
  - **Purpose:** Cognito authentication, session management.  
  - **Collected From:** User input.  
  - **Transmission:** Sent to Amazon Cognito via Amplify Auth SDK (TLS).  
  - **Storage:** Cognito user pool (managed by AWS). The app does not write email addresses or passwords to `localStorage`; Amplify manages authentication session persistence.
  - **User Control:** Signing out clears the managed authentication session.
  - **Disclosure Notes:** Declare collection of email and password for account login.

- **Cognito User Attributes (email, sub, etc.)**  
  - **Code Locations:** `src/components/Account/Account.jsx`, `src/components/Feedback/Feedback.jsx`, and `src/components/AppShell/AuthenticatedApp.jsx` (via `fetchUserAttributes()`).  
  - **Purpose:** Display subscription usage, prefill feedback sender email, determine authenticated state.  
  - **Storage:** Temporarily in component state; long-term in Cognito.  
  - **Disclosure Notes:** Confirm exact attributes retrieved beyond `email` and `sub`. **(NEEDS USER ATTENTION)**

## Subscription & Billing Data
- **Usage Counters (hoursleft, notesleft, tier)**  
  - **Code Locations:** `src/graphql/queries.js` (`getUserSubscription`), `src/graphql/mutations.js` (`updateUserSubscription`), `src/components/Recording/Recording.jsx`, `src/components/Recording/Dictation.jsx`, `src/components/Sidebar/EditPanel.jsx`, `src/components/Account/Account.jsx`.  
  - **Purpose:** Enforce credit limits for recording, dictation, and smart edits; display remaining usage.  
  - **Storage:** DynamoDB table managed by Amplify.  
  - **Transmission:** GraphQL over WebSockets/HTTPS via AWS AppSync.  
  - **Disclosure Notes:** Declare collection of subscription status and consumption metrics.

- **Credit Limit State (out of credits flag)**  
  - **Code Locations:** `src/components/Recording/CreditLimit.jsx`, `src/components/Recording/Recording.jsx`, `src/components/Recording/Dictation.jsx`, `src/components/Sidebar/EditPanel.jsx`.  
  - **Purpose:** Determine when to show credit depletion messaging.  
  - **Storage:** Component state only.  
  - **Disclosure Notes:** No persistent storage; transient UI state.

## Audio & Voice Data
- **Live Audio Recording (Clinical Encounters)**  
  - **Code Location:** `src/components/Recording/RecordingManager.jsx`.  
  - **Purpose:** Capture encounter audio for transcription and SOAP note generation.  
  - **Collection Process:** `src/components/Recording/useMediaRecorderController.js` uses `MediaRecorder` to capture audio chunks from `navigator.mediaDevices.getUserMedia`.  
  - **Storage:** Upload to Amplify Storage (S3) under `protected/{userId}/{timestamp}_recording_{chunk/final}_...`. Stored until backend processing completes.  
  - **Sharing:** `src/components/Recording/useAudioUploadQueue.js` sends an SQS message (`SendMessageCommand`) to `AudioTranscriptionQueue.fifo` to trigger backend processing.  
  - **Disclosure Notes:** Declare collection of microphone audio, storage in S3, processing via AWS Lambda/SQS. Clarify retention/deletion policy. **(NEEDS USER ATTENTION)**

- **Dictation Audio Stream**  
  - **Code Location:** `src/components/Recording/Dictation.jsx`.  
  - **Purpose:** Real-time transcription via AssemblyAI Streaming API.  
  - **Sharing:** PCM data sent to AssemblyAI (third-party processor).  
  - **Storage:** No local persistence; AssemblyAI retention policy unknown. **(NEEDS USER ATTENTION)**  
  - **Disclosure Notes:** Declare sharing of audio with AssemblyAI for transcription; include third-party data processor details.

- **Android Runtime Permission Request & Audio-Only Enforcement (v1.2)**  
  - **Code Location:** `android/app/src/main/java/com/chironote/app/MainActivity.java` (WebChromeClient override with runtime permission handling).  
  - **Purpose:** Ensure proper runtime permission requests for AAB builds and enforce audio-only behavior.  
  - **Implementation:** Two-layer permission system:
    1. **Android Runtime Layer:** Checks `RECORD_AUDIO` permission via `ContextCompat.checkSelfPermission()`, requests via `ActivityCompat.requestPermissions()` if needed (shows system dialog)
    2. **WebView Layer:** Only grants `RESOURCE_AUDIO_CAPTURE` after Android permission confirmed, enforces audio-only by never requesting video permissions
  - **Critical Fix (v1.2):** Added runtime permission request logic to fix AAB builds not showing permission dialogs. Debug APKs worked due to lenient permission handling, but release AABs require explicit `requestPermissions()` calls.
  - **Manifest Permissions (v1.2):** 
    - `INTERNET` - Network access for API calls
    - `RECORD_AUDIO` - Microphone access (requested at runtime)
    - `MODIFY_AUDIO_SETTINGS` - Audio stream control in WebView
    - ~~`CAMERA`~~ - **REMOVED in v1.2** - No longer needed due to proper runtime permission handling
  - **Disclosure Notes:** App only requests and uses microphone permission. The runtime permission system ensures users see exactly what the app accesses (audio only), with no camera permission requested or granted.

## Textual Note & Transcript Data (PHI)
- **Transcripts & SOAP Notes**  
  - **Code Locations:** `src/components/Recording/useNoteGeneration.js` (streamed text), `src/components/AppShell/useNotesHistory.js` (notes and transcripts), `src/graphql/queries.js`, `src/graphql/mutations.js`.  
  - **Purpose:** Deliver transcribed encounters, generate structured SOAP notes, display history.  
  - **Storage:** DynamoDB (`Notes` table) with fields `transcript`, `note`, `noteLabel`, `isCompleted`.  
  - **Sharing:** GraphQL subscription `onUpdateNotesByOwner` pushes updates to clients.  
  - **Disclosure Notes:** Declare storage of medical/clinical text (PHI). Include retention period. **(NEEDS USER ATTENTION)**

- **Streaming Summary Generation**  
  - **Code Location:** `src/components/Recording/useNoteGeneration.js` (`streamResponse()`).  
  - **Purpose:** Send `userId`, `timeStamp`, `noteSettings` to AWS Lambda (`https://xx3olxpcoay5sicmny45g7c5ay0ugvtm.lambda-url.us-east-2.on.aws`) to generate final note.  
  - **Disclosure Notes:** Data sent to AWS Lambda for AI summarization; confirm whether the Lambda stores generated text beyond immediate response. **(NEEDS USER ATTENTION)**

- **Smart Edit (AI Rewrite) Requests**  
  - **Code Location:** `src/components/Sidebar/EditPanel.jsx`.  
  - **Purpose:** Send clipboard content (`noteInput`) and user instructions (`editInput`) to AWS Lambda (`https://yulmp44ybg3ig5ph4nh2hfbibm0ztfin.lambda-url.us-east-2.on.aws`).  
  - **Sharing:** Lambda processes content, streams revised text; updates subscription usage.  
  - **Disclosure Notes:** Declare transmission of note text (PHI) to AWS Lambda for processing; document retention/deletion. **(NEEDS USER ATTENTION)**

- **Clipboard & Edit Panel State**  
  - **Code Locations:** `src/components/AppShell/AuthenticatedApp.jsx` (`clipboardContent`, `editContent`, `streamingText` state), `src/components/Sidebar/EditPanel.jsx`.  
  - **Purpose:** Display, edit, and apply AI changes to notes.  
  - **Storage:** In-memory React state only.  
  - **Disclosure Notes:** No persistent storage beyond existing backend flows.

## Feedback & Support Data
- **Feedback Form Submission**  
  - **Code Location:** `src/components/Feedback/Feedback.jsx`.  
  - **Collected Data:** `subject`, `message`, authenticated user email (prefilled via Cognito).  
  - **Transmission:** POST to AWS Lambda (`https://xmryti2hkkvg5tosvv3p6lehsa0lysic.lambda-url.us-east-2.on.aws/`).  
  - **Storage:** Lambda destination (likely email or ticketing). Confirm retention and downstream systems. **(NEEDS USER ATTENTION)**  
  - **Disclosure Notes:** Declare collection of user feedback content and email; mention support handling.

## Local Preferences & UI State
- **Recording Language & Note Settings**  
  - **Code Location:** `src/components/Recording/Recording.jsx`.  
  - **Data:** `selectedLanguage`, `noteSettings` (flags `examLayout`, `PILayout`).  
  - **Storage:** `localStorage` keys `selectedLanguage`, `noteSettings`.  
  - **Purpose:** Persist user preferences between sessions.  
  - **Disclosure Notes:** On-device only; not shared remotely except when `noteSettings` is forwarded to Lambda/SQS during processing (see above).

- **App Tour Completion Flag**  
  - **Code Location:** `src/components/IntroTour/IntroTour.jsx`.  
  - **Data:** `localStorage` key `hasSeenAppTour`.  
  - **Purpose:** Ensure tour shows only once.  
  - **Disclosure Notes:** On-device only.

- **Dictation Session Timer & Status**  
  - **Code Location:** `src/components/Recording/Dictation.jsx`.  
  - **Data:** Timer value, turn transcripts, status flags in component state; usage hours posted to `updateUserSubscription` after each session.  
  - **Disclosure Notes:** Usage metrics already covered under Subscription & Billing Data.

- **Network Connectivity State**  
  - **Code Location:** `src/components/Recording/CreditLimit.jsx`.  
  - **Data:** `navigator.onLine` boolean stored in state.  
  - **Purpose:** Differentiate between offline errors vs. credit depletion.  
  - **Disclosure Notes:** No persistent storage or transmission.

## Third-Party & Backend Integrations
- **AWS Amplify / AppSync / S3 / DynamoDB / SQS / Lambda**  
  - **Usage:** Core backend infrastructure for authentication, storage, transcription pipeline, AI summarization, and credit tracking.  
  - **Disclosure Notes:** Document AWS as infrastructure provider and outline services handling PHI. Include data residency details if required. **(NEEDS USER ATTENTION)**

- **AssemblyAI Streaming API**  
  - **Usage:** Real-time dictation service. Token fetched from AWS Lambda (`https://tks3r2tlj2kq4rejfvusvqucye0btywr.lambda-url.us-east-2.on.aws`).  
  - **Data Shared:** Microphone audio, partial transcripts.  
  - **Disclosure Notes:** Confirm AssemblyAI data retention, subprocessor agreements, and whether transcripts are stored on their side. **(NEEDS USER ATTENTION)**

- **AWS Lambda Token Endpoints**  
  - **Endpoints:** AssemblyAI token provider, summary generator, smart edit processor, feedback handler.  
  - **Disclosure Notes:** Ensure each Lambda's downstream integrations (e.g., AI models, email services) are documented. **(NEEDS USER ATTENTION)**

---

## Outstanding Questions for Compliance Follow-up
- **Retention Policies:** Provide definitive retention durations for S3 audio, DynamoDB notes, SQS messages, and Lambda logs/artifacts. **(NEEDS USER ATTENTION)**
- **Third-Party Subprocessors:** Confirm AssemblyAI contractual status and data handling specifics. **(NEEDS USER ATTENTION)**
- **Backend AI Services:** Clarify if Lambda functions invoke additional AI vendors (e.g., OpenAI, Bedrock). Not visible in frontend repo. **(NEEDS USER ATTENTION)**
- **User-initiated Deletion Controls:** Document how users can delete audio, transcripts, or feedback submissions. **(NEEDS USER ATTENTION)**
