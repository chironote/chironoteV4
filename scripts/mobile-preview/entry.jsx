import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import '../../src/index.css';
import '../../src/App.css';
import Navbar from '../../src/components/Navbar/Navbar';
import PatientsPage from '../../src/components/Patients/PatientsPage';
import ExportPatientDialog from '../../src/components/Patients/ExportPatientDialog';
import Recording from '../../src/components/Recording/Recording';
import Clipboard from '../../src/components/Clipboard/Clipboard';
import ClipboardButtons from '../../src/components/Clipboard/ClipboardButtons';
import ContentPopup from '../../src/components/Sidebar/ContentPopup';
import { patient, note } from './patientNotes';

function Preview() {
  const [text, setText] = useState(note.note);
  const [popup, setPopup] = useState(true);
  const ref = React.useRef(null);
  const surface = location.hash.slice(1) || 'patients';
  return <MemoryRouter initialEntries={[surface === 'patients' ? '/app/patients' : '/app']}><div className="App">
    <Navbar username="synthetic" onSignOut={() => {}} onFeedback={() => {}} />
    {surface === 'patients' && <PatientsPage desktopSave allowExport onOpenNote={() => { location.hash = 'clipboard'; location.reload(); }} />}
    {surface === 'export' && popup && <ExportPatientDialog patient={patient} onClose={() => setPopup(false)} />}
    {surface === 'capture' && popup && <Recording toggleRecordingPopup={() => setPopup(false)} startRecording={() => {}} discardRecording={() => {}} />}
    {surface === 'clipboard' && <main className="app-main"><section className="clipboard-container"><h2 className="panel-header">Your Clipboard</h2><ClipboardButtons save={{ visible: true, dirty: true, onSave: () => {} }} setClipboardContent={setText} handleCopy={() => {}} toggleRecordingPopup={() => {}} toggleEditPanel={() => {}} startDictation={() => {}} /><div className="clipboard-visit-identity"><strong>{patient.name}</strong><span>2026-10-11 · Follow-up</span></div><Clipboard clipboardTextareaRef={ref} clipboardContent={text} setClipboardContent={setText} setShowCopyMessage={() => {}} /></section></main>}
    {surface === 'popup' && popup && <ContentPopup setShowContentPopup={setPopup} setShowPopupMenu={() => {}} showNotes selectedContent={note.note} timestamp={note.timestamp} patientId={patient.patientId} noteLabel={note.visitLabel} onLabelUpdate={() => {}} handleCopy={() => {}} handleSendToClipboard={() => {}} togglePopupMenu={() => {}} />}
  </div></MemoryRouter>;
}
createRoot(document.getElementById('root')).render(<Preview />);
