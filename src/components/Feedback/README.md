# Feedback Components

`Feedback.jsx` is a controlled modal opened by authenticated navigation. It uses the shared `ProductDialog`, loads the authenticated email, preserves the required Lambda endpoint and payload shape, and always sends the literal subject `Feedback`. It prevents duplicate submission, preserves message text on failure, and uses inline accessible error/success states instead of alerts.

`Feedback.css` follows the canonical authenticated form and button system. A successful submission resets the message and presents an explicit Close action; reopening begins clean and focuses the textarea.
