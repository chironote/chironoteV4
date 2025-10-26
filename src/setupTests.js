// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// =============================================================================
// WEB AUDIO API MOCKS
// =============================================================================

// Mock AudioContext
class MockAudioContext {
  constructor(options = {}) {
    this.state = 'running';
    this.sampleRate = options.sampleRate || 48000;
    this.destination = { connect: jest.fn() };
    this.audioWorklet = {
      addModule: jest.fn().mockResolvedValue(undefined)
    };
    this._closed = false;
  }

  async resume() {
    this.state = 'running';
    return Promise.resolve();
  }

  async close() {
    this.state = 'closed';
    this._closed = true;
    return Promise.resolve();
  }

  createMediaStreamSource(stream) {
    return {
      connect: jest.fn(),
      disconnect: jest.fn(),
      stream
    };
  }
}

global.AudioContext = MockAudioContext;
global.webkitAudioContext = MockAudioContext;

// Mock AudioWorkletNode
class MockAudioWorkletNode {
  constructor(context, name, options) {
    this.context = context;
    this.name = name;
    this.port = {
      postMessage: jest.fn(),
      onmessage: null,
      close: jest.fn()
    };
    this._connected = false;
  }

  connect(destination) {
    this._connected = true;
    return destination;
  }

  disconnect() {
    this._connected = false;
  }
}

global.AudioWorkletNode = MockAudioWorkletNode;

// =============================================================================
// MEDIA RECORDER API MOCKS
// =============================================================================

class MockMediaRecorder {
  constructor(stream, options = {}) {
    this.stream = stream;
    this.options = options;
    this.state = 'inactive';
    this.ondataavailable = null;
    this.onstop = null;
    this.onerror = null;
    this.onstart = null;
    this.onpause = null;
    this.onresume = null;
  }

  start(timeslice) {
    this.state = 'recording';
    if (this.onstart) this.onstart();
  }

  stop() {
    this.state = 'inactive';
    if (this.onstop) this.onstop();
  }

  pause() {
    this.state = 'paused';
    if (this.onpause) this.onpause();
  }

  resume() {
    this.state = 'recording';
    if (this.onresume) this.onresume();
  }

  static isTypeSupported(mimeType) {
    // Simulate browser-specific support
    const userAgent = global.navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('firefox')) {
      return mimeType === 'audio/webm';
    }
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      return mimeType === 'video/mp4';
    }
    // Chrome/Edge
    return mimeType === 'audio/webm; codecs="pcm"' || mimeType === 'audio/webm';
  }
}

global.MediaRecorder = MockMediaRecorder;

// =============================================================================
// USER MEDIA API MOCKS
// =============================================================================

const mockMediaStream = {
  id: 'mock-stream-id',
  active: true,
  getTracks: jest.fn(() => [
    {
      kind: 'audio',
      id: 'mock-audio-track',
      enabled: true,
      stop: jest.fn(),
      getSettings: jest.fn(() => ({
        sampleRate: 48000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }))
    }
  ]),
  getAudioTracks: jest.fn(() => [
    {
      kind: 'audio',
      id: 'mock-audio-track',
      enabled: true,
      stop: jest.fn(),
      getSettings: jest.fn(() => ({
        sampleRate: 48000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }))
    }
  ]),
  getVideoTracks: jest.fn(() => []),
  addTrack: jest.fn(),
  removeTrack: jest.fn()
};

global.navigator.mediaDevices = {
  getUserMedia: jest.fn(() => Promise.resolve(mockMediaStream)),
  enumerateDevices: jest.fn(() => Promise.resolve([
    { kind: 'audioinput', deviceId: 'mock-mic-1', label: 'Mock Microphone' }
  ]))
};

global.navigator.permissions = {
  query: jest.fn(() => Promise.resolve({ state: 'granted' }))
};

// =============================================================================
// NOSLEEP.JS MOCK
// =============================================================================

class MockNoSleep {
  constructor() {
    this._enabled = false;
    this.enableCallCount = 0;
    this.disableCallCount = 0;
  }

  enable() {
    this._enabled = true;
    this.enableCallCount++;
    return Promise.resolve();
  }

  disable() {
    this._enabled = false;
    this.disableCallCount++;
  }

  get isEnabled() {
    return this._enabled;
  }
}

jest.mock('nosleep.js', () => {
  return jest.fn().mockImplementation(() => new MockNoSleep());
});

// =============================================================================
// ASSEMBLYAI SDK MOCKS
// =============================================================================

class MockStreamingTranscriber {
  constructor(config) {
    this.config = config;
    this.listeners = {
      open: [],
      close: [],
      error: [],
      transcript: [],
      turn: []
    };
    this._connected = false;
    this._closed = false;
    
    // Track constructor calls for billing prevention tests
    if (global.mockTranscriberConstructorCalls) {
      global.mockTranscriberConstructorCalls.push(config);
    }
  }

  async connect() {
    this._connected = true;
    this._closed = false;
    // Simulate connection opening
    setTimeout(() => {
      this.listeners.open.forEach(fn => fn());
    }, 10);
    return Promise.resolve();
  }

  async close() {
    this._connected = false;
    this._closed = true;
    this.listeners.close.forEach(fn => fn());
    return Promise.resolve();
  }

  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  stream() {
    // Return a mock writable stream
    return {
      getWriter: () => ({
        write: jest.fn().mockResolvedValue(undefined),
        close: jest.fn().mockResolvedValue(undefined),
        abort: jest.fn().mockResolvedValue(undefined)
      })
    };
  }

  // Helper for tests to simulate events
  simulateEvent(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(fn => fn(data));
    }
  }
}

jest.mock('assemblyai', () => ({
  StreamingTranscriber: jest.fn((config) => new MockStreamingTranscriber(config))
}));

// =============================================================================
// AWS AMPLIFY MOCKS
// =============================================================================

// Mock Auth
jest.mock('aws-amplify/auth', () => ({
  getCurrentUser: jest.fn(() => Promise.resolve({
    userId: 'mock-user-id',
    username: 'mock-username'
  })),
  fetchAuthSession: jest.fn(() => Promise.resolve({
    credentials: {
      accessKeyId: 'mock-access-key',
      secretAccessKey: 'mock-secret-key',
      sessionToken: 'mock-session-token'
    },
    tokens: {
      idToken: { toString: () => 'mock-id-token' }
    }
  }))
}));

// Mock Storage
jest.mock('aws-amplify/storage', () => ({
  uploadData: jest.fn(() => ({
    result: Promise.resolve({
      path: 'mock-s3-path',
      key: 'mock-key'
    })
  }))
}));

// Mock API/GraphQL
const mockGenerateClient = () => ({
  graphql: jest.fn(() => Promise.resolve({
    data: {
      getUserSubscription: {
        owner: 'test-user-id',
        tier: 'free',
        hoursleft: 10,
        notesleft: 100,
        hoursSaved: 0,
        isActivated: false,
        has3Notes: false,
        has5Notes: false
      }
    }
  }))
});

jest.mock('aws-amplify/api', () => ({
  generateClient: jest.fn(() => mockGenerateClient())
}));

// =============================================================================
// AWS SQS MOCK
// =============================================================================

class MockSendMessageCommand {
  constructor(params) {
    this.params = params;
  }
}

class MockSQSClient {
  constructor(config) {
    this.config = config;
  }

  async send(command) {
    return Promise.resolve({
      MessageId: 'mock-message-id',
      MD5OfMessageBody: 'mock-md5'
    });
  }
}

jest.mock('@aws-sdk/client-sqs', () => ({
  SQSClient: jest.fn((config) => new MockSQSClient(config)),
  SendMessageCommand: jest.fn((params) => new MockSendMessageCommand(params))
}));

// =============================================================================
// READABLE STREAM API MOCK
// =============================================================================

class MockReadableStream {
  constructor({ start, cancel } = {}) {
    this.controller = {
      enqueue: jest.fn(),
      close: jest.fn(),
      error: jest.fn()
    };
    this._locked = false;
    
    if (start) {
      start(this.controller);
    }
    
    this._cancelCallback = cancel;
  }

  async pipeTo(destination) {
    this._locked = true;
    return Promise.resolve();
  }

  async cancel(reason) {
    if (this._cancelCallback) {
      await this._cancelCallback(reason);
    }
  }

  get locked() {
    return this._locked;
  }
}

global.ReadableStream = MockReadableStream;

// =============================================================================
// URL API MOCKS
// =============================================================================

global.URL.createObjectURL = jest.fn(() => 'mock-blob-url');
global.URL.revokeObjectURL = jest.fn();

// =============================================================================
// BLOB API MOCK
// =============================================================================

class MockBlob {
  constructor(content, options = {}) {
    this.content = content;
    this.type = options.type || '';
    this.size = Array.isArray(content) ? content.join('').length : 0;
  }
}

global.Blob = MockBlob;

// =============================================================================
// PAGE VISIBILITY API MOCK
// =============================================================================

Object.defineProperty(document, 'hidden', {
  writable: true,
  configurable: true,
  value: false
});

Object.defineProperty(document, 'visibilityState', {
  writable: true,
  configurable: true,
  value: 'visible'
});

// =============================================================================
// FETCH API MOCK (for AssemblyAI token)
// =============================================================================

global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({
      token: 'mock-assemblyai-token',
      expiresIn: 10800 // 3 hours in seconds
    })
  })
);

// =============================================================================
// LOCAL STORAGE MOCK
// =============================================================================

class LocalStorageMock {
  constructor() {
    this.store = {};
  }

  clear() {
    this.store = {};
  }

  getItem(key) {
    return this.store[key] || null;
  }

  setItem(key, value) {
    this.store[key] = String(value);
  }

  removeItem(key) {
    delete this.store[key];
  }

  get length() {
    return Object.keys(this.store).length;
  }

  key(index) {
    const keys = Object.keys(this.store);
    return keys[index] || null;
  }
}

global.localStorage = new LocalStorageMock();

// =============================================================================
// CONSOLE SUPPRESSIONS (Optional - uncomment to reduce test noise)
// =============================================================================

// Suppress console logs during tests (comment out for debugging)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };

// =============================================================================
// HELPER: Reset all mocks between tests
// =============================================================================

export const resetAllMocks = () => {
  jest.clearAllMocks();
  global.localStorage.clear();
  document.hidden = false;
  document.visibilityState = 'visible';
  
  // Reset fetch mock
  global.fetch.mockImplementation(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        token: 'mock-assemblyai-token',
        expiresIn: 10800
      })
    })
  );
  
  // Reset getUserMedia mock
  global.navigator.mediaDevices.getUserMedia.mockImplementation(() => 
    Promise.resolve(mockMediaStream)
  );
  
  // Reset transcriber constructor tracking
  global.mockTranscriberConstructorCalls = [];
};

// =============================================================================
// JEST CONFIGURATION
// =============================================================================

// Set test timeout
jest.setTimeout(10000);
