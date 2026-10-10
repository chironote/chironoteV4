import { TextEncoder, TextDecoder } from 'util';
import { Request, Response, Headers } from 'whatwg-fetch';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.Request = Request;
global.Response = Response;
global.Headers = Headers;
