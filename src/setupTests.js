import { TextDecoder, TextEncoder } from 'util';
import 'react-app-polyfill/jsdom';

// CRA's older jsdom lacks the browser globals needed by the actual Router 7.
global.TextEncoder ??= TextEncoder;
global.TextDecoder ??= TextDecoder;
