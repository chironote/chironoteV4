# Repository Guidelines

## Project Structure & Module Organization

This is a Create React App front end backed by AWS Amplify. Source lives in `src/`, with route wiring in `src/App.jsx` and entry in `src/index.js`. Reusable UI is under `src/components/`; generated Amplify UI forms are under `src/ui-components/`; shared helpers live in `src/constants/`, `src/services/`, and `src/utils/`. Static assets are in `src/assets/` and `public/`. Amplify configuration is in `amplify/`; generated GraphQL code is in `src/graphql/` and `src/models/`.

Each immediate feature folder under `src/components/` has its own `README.md` that documents the folder contents, ownership, important code paths, and maintenance notes. These README files are part of the project structure: when an agent changes, adds, removes, or materially reorganizes component code in one of these folders, it is responsible for keeping that folder's `README.md` accurate in the same change.

## Recording Core Architecture

The recording workflow is the heart of the app. `src/components/Recording/RecordingManager.jsx` is the public hook-style API consumed by `Recording.jsx`; keep it as orchestration, not implementation bulk. Responsibilities are split into `useMediaRecorderController.js` for microphone/MediaRecorder lifecycle, `useAudioUploadQueue.js` for S3 uploads and SQS dispatch, `useNoteGeneration.js` for transcript subscription and Lambda streaming, plus helpers like `recordingConstants.js`, `recordingAuth.js`, and `noteGenerationErrors.js`.

## Build, Test, and Development Commands

Use npm with the checked-in `package-lock.json`.

- `npm install`: install dependencies.
- `npm start`: run the local React dev server at `http://localhost:3000`.
- `npm run build`: create the production build in `build/`, then run `defer-css.js`.
- `npm run eject`: eject CRA configuration. Treat this as irreversible and avoid it unless explicitly agreed.

There is currently no `npm test` script in `package.json`.

## Coding Style & Naming Conventions

Use JavaScript and JSX with ES module imports. Existing code uses 2-space indentation, single quotes, semicolons, and PascalCase component names such as `RecordingManager.jsx`. Keep feature files under `src/components/FeatureName/`. Prefer camelCase utilities, for example `markdownStripper.js`. CRA's `react-app` ESLint config is enabled; address lint warnings shown by `npm start` or build output.

## Testing Guidelines

No active test framework or test directory is present. When adding tests, follow CRA/Jest conventions: place files next to the unit as `ComponentName.test.jsx` or `helper.test.js`, and add a `test` script before relying on automation. Prioritize recording flows, auth state, GraphQL interactions, and clinical note text utilities.

## Commit & Pull Request Guidelines

Recent commits use short, descriptive subjects, for example `Recorder Updates` and `Fix octet stream error`. Keep commits focused. Pull requests should include a summary, user impact, validation such as `npm run build`, and screenshots or recordings for UI changes. Link deployment notes when Amplify resources, auth, storage, or GraphQL schema files change.

## Security & Configuration Tips

Do not commit secrets, local AWS credentials, or private patient data. Treat `src/amplifyconfiguration.json`, `src/aws-exports.js`, and `amplify/team-provider-info.json` as environment-sensitive. Avoid editing generated Amplify files manually unless part of a deliberate backend update.
