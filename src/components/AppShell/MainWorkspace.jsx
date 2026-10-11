import React from 'react';
import PatientName from '../Patients/PatientName';
import Recording from '../Recording/Recording';
import DictationPopup from '../Recording/DictationPopup';
import ClipboardButtons from '../Clipboard/ClipboardButtons';
import Clipboard from '../Clipboard/Clipboard';
import EditPanel from '../Sidebar/EditPanel';
import ContentPopup from '../Sidebar/ContentPopup';
import HistorySidebar from '../Sidebar/HistorySidebar';
import MobileHistoryToggle from '../Sidebar/MobileHistoryToggle';

function MainWorkspace({
  user,
  notesHistory,
  sidebar,
  clipboard,
  editPanel,
  recording,
  dictation,
  contentPopup
}) {
  const isHistoryToggleDisabled = recording.showRecordingPopup ||
    recording.manager.isStarting ||
    recording.manager.isRecording ||
    recording.manager.isPreparingTranscript ||
    recording.manager.isGeneratingSummary;

  return (
    <main className="app-main">
      <HistorySidebar
        notes={notesHistory.notes}
        isCollapsed={sidebar.isCollapsed}
        isLoading={notesHistory.isLoading}
        fetchError={notesHistory.fetchError}
        collapsedWeeks={notesHistory.collapsedWeeks}
        newItems={notesHistory.newItems}
        onRefresh={notesHistory.refreshNotes}
        onItemClick={contentPopup.onOpen}
        onDragStart={() => {}}
        onRemoveHighlight={notesHistory.removeHighlight}
        onToggleWeek={notesHistory.toggleWeekCollapse}
      />
      <MobileHistoryToggle
        isCollapsed={sidebar.isCollapsed}
        isDragOver={sidebar.isMobileOverlayDragOver}
        isDisabled={isHistoryToggleDisabled}
        overlayRef={sidebar.mobileOverlayRef}
        onClose={sidebar.close}
        onDragOver={sidebar.onMobileOverlayDragOver}
        onDragLeave={sidebar.onMobileOverlayDragLeave}
        onDrop={sidebar.onMobileOverlayDrop}
        onToggle={sidebar.togglePanel}
      />
      <section className="clipboard-container">
        <h2 className="panel-header">Your Clipboard</h2>
        <ClipboardButtons
          toggleRecordingPopup={recording.toggleRecordingPopup}
          toggleDictationPopup={dictation.toggleDictationPopup}
          toggleEditPanel={editPanel.toggleEditPanel}
          showEditPanel={editPanel.showEditPanel}
          setClipboardContent={clipboard.setClipboardContent}
          handleCopy={clipboard.handleCopy}
          showCopyMessage={clipboard.showCopyMessage}
          isDictationLoading={dictation.isDictationLoading}
          isTranscribing={dictation.isTranscribing}
          isWebSocketConnecting={dictation.isWebSocketConnecting}
          startDictation={dictation.main.toggleDictation}
          dictationReady={dictation.main.isInitialized}
          save={clipboard.save}
        />
        {clipboard.target && <div className="clipboard-visit-identity"><PatientName patientId={clipboard.target.patientId} /><span>{clipboard.target.dateOfService || 'Undated visit'} · {clipboard.target.visitLabel || clipboard.target.noteLabel || 'Saved note'}</span></div>}
        {clipboard.review}
        <Clipboard
          clipboardTextareaRef={clipboard.clipboardTextareaRef}
          clipboardContent={clipboard.clipboardContent}
          setClipboardContent={clipboard.setClipboardContent}
          streamContent={clipboard.streamingText}
          onSavedNoteDrop={clipboard.onSavedNoteDrop}
          onTextDrop={clipboard.onTextDrop}
          setShowCopyMessage={clipboard.setShowCopyMessage}
          isDisabled={dictation.isDictationLoading || clipboard.noteStreamActive || clipboard.save?.busy}
          isTranscribing={dictation.isTranscribing}
        />
      </section>

      <EditPanel
        showEditPanel={editPanel.showEditPanel}
        editContent={editPanel.editContent}
        textareaRef={editPanel.editTextareaRef}
        setEditContent={editPanel.setEditContent}
        clipboardContent={clipboard.clipboardContent}
        setClipboardContent={clipboard.setClipboardContent}
        userId={user.username}
        onTextStreamUpdate={clipboard.handleTextStreamUpdate}
        editDictationToggle={dictation.edit.toggleDictation}
        isEditDictationLoading={dictation.edit.isDictationLoading}
        isEditTranscribing={dictation.edit.isTranscribing}
        isEditWebSocketConnecting={dictation.edit.isWebSocketConnecting}
        editCreditPopupElement={dictation.edit.creditPopupElement}
      />

      {(recording.showRecordingPopup ||
        recording.manager.isPreparingTranscript ||
        recording.manager.isGeneratingSummary) && (
        <Recording
          toggleRecordingPopup={recording.toggleRecordingPopup}
          recordingType={recording.recordingType}
          isStarting={recording.manager.isStarting}
          isRecording={recording.manager.isRecording}
          isPaused={recording.manager.isPaused}
          isPreparingTranscript={recording.manager.isPreparingTranscript}
          isGeneratingSummary={recording.manager.isGeneratingSummary}
          startRecording={recording.manager.startRecording}
          stopRecording={recording.manager.stopRecording}
          discardRecording={recording.manager.discardRecording}
          pauseRecording={recording.manager.pauseRecording}
          resumeRecording={recording.manager.resumeRecording}
        />
      )}

      {dictation.main.creditPopupElement}

      {dictation.showDictationPopup && (
        <DictationPopup
          isLoading={dictation.isDictationLoading}
          isTranscribing={dictation.isTranscribing}
          onClose={dictation.toggleDictationPopup}
          onToggleDictation={dictation.main.toggleDictation}
        />
      )}

      {contentPopup.showContentPopup && (
        <ContentPopup
          setShowContentPopup={contentPopup.setShowContentPopup}
          setShowPopupMenu={contentPopup.setShowPopupMenu}
          showNotes={contentPopup.showNotes}
          showPopupMenu={contentPopup.showPopupMenu}
          togglePopupMenu={contentPopup.togglePopupMenu}
          handleCopy={clipboard.handleCopy}
          handleSendToClipboard={contentPopup.handleSendToClipboard}
          selectedContent={contentPopup.selectedContent}
          showPopupCopyMessage={contentPopup.showPopupCopyMessage}
          timestamp={contentPopup.selectedTimestamp}
          noteLabel={contentPopup.selectedItem?.visitLabel || contentPopup.selectedItem?.noteLabel}
          patientId={contentPopup.selectedItem?.patientId}
          onPatientAssigned={contentPopup.onPatientAssigned}
          onLabelUpdate={contentPopup.handleLabelUpdate}
          onViewModeChange={contentPopup.handlePopupViewModeChange}
          hasTranscript={Boolean(contentPopup.selectedItem?.transcript && contentPopup.selectedItem.transcript.trim() !== '')}
        />
      )}
    </main>
  );
}

export default MainWorkspace;
