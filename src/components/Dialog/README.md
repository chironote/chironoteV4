# Product Dialog

`ProductDialog.jsx` is the shared authenticated-product modal foundation used by Feedback and Custom Instructions. It portals above the app shell, traps focus, restores focus to the trigger, locks body scrolling, and supports Escape/scrim dismissal unless a consequential request disables dismissal.

`ProductDialog.css` owns the STYLE.md scrim, surface, responsive viewport gutters, internal scrolling, focus ring, z-index, and reduced-motion rules. Callers own their form content and any dirty-editor confirmation.
