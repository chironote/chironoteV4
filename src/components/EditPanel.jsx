import arrowLeftIcon from '../assets/arrow-left.svg';

const EditPanel = ({ showEditPanel, editContent, setEditContent, setClipboardContent }) => {
  return (
    <section className={`edit-panel ${showEditPanel ? 'visible' : ''}`}>
      <h4>Note Updater</h4>
      <textarea
        className="edit-textarea"
        placeholder="Enter any changes you wish applied to the note on the left"
        value={editContent}
        onChange={(e) => setEditContent(e.target.value)}
      />

      {/* Link to clear the text area */}
      <a
        href="javascript(void)"
        className="clear-edit-link"
        onClick={(e) => { e.preventDefault(); setEditContent(''); }}
      >
        Clear text
      </a>

      {/* Button to apply changes from the textarea to clipboard content */}
      <button
        className="apply-changes-button"
        onClick={() => setClipboardContent(editContent)}
      >
        <img src={arrowLeftIcon} alt="Arrow Left" className="button-icon left-arrow" />
        <span>Apply Changes</span>
      </button>
    </section>
  )
}

export default EditPanel;