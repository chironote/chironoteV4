import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AuthenticatedApp from './AuthenticatedApp';
import { isNativePlatform } from '../../services/nativePlatform';

jest.mock('../../services/nativePlatform', () => ({ isNativePlatform: jest.fn(), writeClipboardText: jest.fn() }));

jest.mock('../../services/patientNotes', () => ({ patientNotesEnabled: false, patientRequest: jest.fn() }));
jest.mock('../Patients/useDesktopSave', () => () => true);
jest.mock('../Patients/useClipboardSave', () => () => ({}));
jest.mock('../Patients/useDraftGuard', () => () => ({}));
jest.mock('aws-amplify/auth', () => ({ fetchUserAttributes: jest.fn() }));
jest.mock('../Account/Account', () => () => null);


jest.mock('../Settings/Settings', () => () => null);
jest.mock('../Feedback/Feedback', () => () => null);
jest.mock('../IntroTour/IntroTour', () => () => null);
jest.mock('../Recording/RecordingManager', () => () => ({}));
jest.mock('../Recording/Dictation', () => () => ({}));

jest.mock('./useNotesHistory', () => () => ({}));
jest.mock('../../services/amplifyClient', () => ({ getAmplifyClient: jest.fn() }));
jest.mock('../../utils/analytics', () => ({ trackRecordingCompleted: jest.fn() }));
jest.mock('../Navbar/Navbar', () => () => null);
jest.mock('./MainWorkspace', () => ({ editPanel, phoneLayout, smartEditorAvailable }) => <main>
  <span data-testid="state">{String(editPanel.showEditPanel)}</span>
  <span data-testid="phone">{String(phoneLayout)}</span>
  <span data-testid="available">{String(smartEditorAvailable)}</span>
  <span data-testid="edit-draft">{editPanel.editContent}</span>
  <input aria-label="Editor draft" onChange={event => editPanel.setEditContent(event.target.value)} />
  <button onClick={editPanel.toggleEditPanel}>Attempt editor</button>
</main>);

global.IS_REACT_ACT_ENVIRONMENT = true;
let root, container, width, screenWidth, screenHeight;
beforeEach(() => {
  isNativePlatform.mockReturnValue(false);
  width = window.innerWidth;
  screenWidth = Object.getOwnPropertyDescriptor(window.screen, 'width');
  screenHeight = Object.getOwnPropertyDescriptor(window.screen, 'height');
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount()); container.remove(); window.innerWidth = width;
  if (screenWidth) Object.defineProperty(window.screen, 'width', screenWidth); else delete window.screen.width;
  if (screenHeight) Object.defineProperty(window.screen, 'height', screenHeight); else delete window.screen.height;
});
const resize = (innerWidth, width, height) => {
  window.innerWidth = innerWidth;
  Object.defineProperty(window.screen, 'width', { configurable: true, value: width });
  Object.defineProperty(window.screen, 'height', { configurable: true, value: height });
  window.dispatchEvent(new Event('resize'));
};
const render = () => root.render(<MemoryRouter initialEntries={['/app']}><Routes><Route path="/app/*" element={<AuthenticatedApp user={{ username: 'synthetic' }} />} /></Routes></MemoryRouter>);
const shortcut = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true, bubbles: true }));

test.each([[375, false], [812, false], [375, true], [812, true]])('phone width %s native=%s rejects direct toggle and Ctrl+B', async (width, native) => {
  isNativePlatform.mockReturnValue(native);
  resize(width, 375, 812);
  await act(async () => render());
  await act(async () => { container.querySelector('button').click(); shortcut(); });
  expect(container.querySelector('[data-testid="state"]').textContent).toBe('false');
  expect(container.querySelector('.app').classList.contains('clipboard-phone-layout')).toBe(true);
  expect(container.querySelector('.app').classList.contains('clipboard-native-layout')).toBe(native);
});

test.each([768, 1024, 1366])('native tablet width %s rejects toggle and Ctrl+B without phone styling', async width => {
  isNativePlatform.mockReturnValue(true);
  resize(width, 768, 1024);
  await act(async () => render());
  await act(async () => { container.querySelector('button').click(); shortcut(); });
  expect(container.querySelector('[data-testid="state"]').textContent).toBe('false');
  expect(container.querySelector('[data-testid="available"]').textContent).toBe('false');
  expect(container.querySelector('[data-testid="phone"]').textContent).toBe('false');
  expect(container.querySelector('.app').classList.contains('clipboard-native-layout')).toBe(true);
});

test('desktop retains Ctrl+B and entering phone layout clears stale editor state', async () => {
  resize(1280, 1920, 1080);
  await act(async () => render());
  await act(async () => shortcut());
  expect(container.querySelector('[data-testid="state"]').textContent).toBe('true');
  await act(async () => {
    const input = container.querySelector('input');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'Keep this editor draft');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  expect(container.querySelector('[data-testid="edit-draft"]').textContent).toBe('Keep this editor draft');
  await act(async () => resize(812, 375, 812));
  expect(container.querySelector('[data-testid="state"]').textContent).toBe('false');
  expect(container.querySelector('[data-testid="edit-draft"]').textContent).toBe('Keep this editor draft');
  await act(async () => resize(1280, 1920, 1080));
  expect(container.querySelector('[data-testid="state"]').textContent).toBe('false');
});
