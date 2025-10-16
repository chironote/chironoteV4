import React, { useEffect, useState } from 'react';
import Shepherd from 'shepherd.js';
import 'shepherd.js/dist/css/shepherd.css';
import { offset } from '@floating-ui/dom';

/**
 * IntroTour component - Manages the Shepherd.js tour for first-time users
 * Shows a guided tour highlighting key UI elements when a user first visits the app
 */
function IntroTour() {
  // Track the current step to help with debugging
  const [currentStep, setCurrentStep] = useState(null);

  useEffect(() => {
    const tourShown = localStorage.getItem('hasSeenAppTour');

    if (!tourShown) {
      // Add custom CSS for better spacing and tour overlay
      const addCustomStyles = () => {
        if (document.getElementById('shepherd-custom-spacing')) return;
        
        const styleEl = document.createElement('style');
        styleEl.id = 'shepherd-custom-spacing';
        styleEl.textContent = `
          .shepherd-element {
            margin-top: 30px !important;
            margin-bottom: 30px !important;
            z-index: 10000 !important;
            border-radius: 8px !important;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15) !important;
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Oxygen, Ubuntu, Cantarell, sans-serif !important;
            max-width: 400px !important;
          }
          /* Twice as dark shadow for step 2 */
          .darker-shadow-step {
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3) !important;
          }
          .shepherd-text {
            color: #333 !important;
            font-size: 15px !important;
            line-height: 1.5 !important;
            padding: 12px !important; /* Reduced top/bottom padding */
            margin-bottom: 0 !important; /* Remove bottom margin */
          }
          .shepherd-footer {
            padding: 0 16px 12px !important; /* Reduced bottom padding */
          }
          .shepherd-button {
            background-color: var(--medium-green) !important;
            border-radius: 4px !important;
            color: white !important;
            font-weight: 500 !important;
            padding: 8px 16px !important;
            transition: background-color 0.2s ease !important;
            margin-bottom: -5px !important; /* Remove bottom margin */
          }
          .shepherd-button:hover {
            background-color: var(--dark-green) !important;
          }
          .shepherd-element[data-popper-placement^="right"] {
            margin-left: 30px !important;
          }
          .shepherd-element[data-popper-placement^="left"] {
            margin-right: 30px !important;
          }
          .shepherd-arrow {
            height: 16px !important;
          }
          .shepherd-arrow:before {
            background-color: white !important;
          }
          .shepherd-header {
            padding: 12px 16px 0 !important; /* Reduced top padding */
          }
          .shepherd-cancel-icon {
            color: #666 !important;
            font-size: 24px !important;
            transition: color 0.2s ease !important;
          }
          .shepherd-cancel-icon:hover {
            color: #333 !important;
          }
          .tour-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: transparent;
            z-index: 9999;
            pointer-events: all;
          }
          .shepherd-modal-overlay-container {
            z-index: 9998 !important;
            background-color: rgba(0, 0, 0, 0.2) !important; /* Lighter overlay */
          }
          
          /* Make the modal overlay more specific to avoid affecting popups */
          .shepherd-modal-overlay-container.shepherd-modal-is-visible {
            pointer-events: none !important; /* Allow clicks through the overlay */
          }
          
          /* Ensure elements are interactive during the tour */
          .shepherd-target.shepherd-enabled {
            z-index: 9999 !important;
            position: relative !important;
            pointer-events: auto !important; /* Allow interaction with the target */
          }
          
          /* Ensure popup content remains with its original styling */
          .popup-content.shepherd-target.shepherd-enabled {
            background-color: white !important;
          }
          .shepherd-has-title .shepherd-content .shepherd-header {
            background: transparent !important;
            padding-bottom: 0 !important;
          }
          .shepherd-title {
            color: var(--dark-green) !important;
            font-size: 18px !important;
            font-weight: 600 !important;
            margin-bottom: -10px;
          }
          /* Step-specific styles */
          /* Remove highlight styling for all steps */
          .shepherd-highlight {
            /* No special styling - this matches step 2's approach */
          }
        `;
        document.head.appendChild(styleEl);
      };
      
      // Add the custom styles
      addCustomStyles();
      
      const tour = new Shepherd.Tour({
        useModalOverlay: true,
        exitOnEsc: true, // Allow exiting with Escape key
        keyboardNavigation: false, // Disable keyboard navigation
        defaultStepOptions: {
          classes: 'shepherd-theme-custom',
          scrollTo: { behavior: 'smooth', block: 'center' },
          cancelIcon: {
            enabled: true
          },
          arrow: true,
          highlightClass: null, // Set to null to completely disable highlighting
          modalOverlayOpeningPadding: 10, // Add padding around all highlighted elements
          modalOverlayOpeningRadius: 8, // Rounded corners for the opening
          popperOptions: {
            modifiers: [{
              name: 'offset',
              options: {
                offset: [0, 30], // Global offset of 30px
              },
            }],
          }
        }
      });

      // Simple variable to track if we've already processed the popup close
      let popupClosedFlag = false;

      // Step 1: Highlight the New Note button
      tour.addStep({
        id: 'new-note-step',
        title: 'Create New Notes',
        text: 'Welcome to ChiroNote! The button above transforms patient conversations into SOAP notes. Press the New Note button now to see how it works.',
        attachTo: {
          element: '#new-note-btn',
          on: 'bottom'
        },
        buttons: [], // No buttons - user must click the actual New Note button
        advanceOn: { selector: '#new-note-btn', event: 'click' } // This will mark step 1 as complete when button is clicked
      });
      
      // Listen for when step 1 is completed (user clicked the New Note button)
      tour.on('complete', (e) => {
        if (e && e.step && e.step.id === 'new-note-step') {
          console.log('Step 1 completed - user clicked New Note button');
          
          // Wait for the popup to appear and then show step 2
          const checkForPopup = () => {
            const popup = document.querySelector('.recording-menu-popup') || document.querySelector('.create-note-popup');
            const popupContent = document.querySelector('.popup-content');
            
            if (popup && popupContent) {
              console.log('Popup found, showing step 2 (recording menu)');
              // Ensure DOM is fully rendered before showing the step
              setTimeout(() => {
                // Verify element still exists before showing step
                if (document.querySelector('.popup-content')) {
                  tour.show('recording-menu-step');
                } else {
                  console.warn('Popup content disappeared before tour could show');
                  tour.show('microphone-step'); // Skip to next step if popup disappeared
                }
              }, 500); // Increased delay to ensure DOM is ready
            } else {
              // Keep checking until popup appears (with a timeout)
              setTimeout(checkForPopup, 100);
            }
          };
          
          // Start checking for the popup
          setTimeout(checkForPopup, 100);
        }
      });
      
      // Track step changes for debugging
      tour.on('show', (e) => {
        console.log(`Showing step: ${e.step.id}`);
        setCurrentStep(e.step.id);
      });

      // Step 2: Highlight the Recording Menu
      tour.addStep({
        id: 'recording-menu-step',
        title: 'Recording Settings',
        text: 'Here you can configure the language for best accuracy and we highly recommend using the Exam format for intakes and re-evals. Let us leave the menu alone for now to quickly finish the tour. Press Next below to continue.',
        attachTo: {
          element: '.popup-content',
          on: 'top'
        },
        classes: 'darker-shadow-step',
        floatingUIOptions: {
          middleware: [
            offset({ mainAxis: 25 }) // Move up by 15px (negative value moves up)
          ]
        },
        // Prevent clicks outside the tour dialog
        modalOverlayOpeningPadding: 10,
        modalOverlayOpeningRadius: 4,
        canClickTarget: false, // Prevent clicking the target element
        cancelOnTargetClick: false, // Prevent cancellation when clicking target
        advanceOn: undefined, // Disable automatic advancement
        when: {
          // Add an event handler when the step is shown
          show: () => {
            // Create a full-screen overlay to block all clicks
            const overlay = document.createElement('div');
            overlay.className = 'tour-overlay';
            overlay.id = 'tour-step2-overlay';
            overlay.addEventListener('click', (e) => {
              // Prevent clicks from propagating
              e.preventDefault();
              e.stopPropagation();
              return false;
            });
            document.body.appendChild(overlay);
            
            // Add a temporary overlay to prevent clicks on the Start Recording button
            const startBtn = document.querySelector('.recording-start-button');
            if (startBtn) {
              startBtn.style.pointerEvents = 'none';
            }
            
            // Disable all click events in the popup content and add darkening overlay
            const popupContent = document.querySelector('.popup-content');
            if (popupContent) {
              // Save original pointer events and background to restore later
              popupContent.dataset.originalPointerEvents = popupContent.style.pointerEvents;
              popupContent.dataset.originalPosition = popupContent.style.position;
              popupContent.dataset.originalBackground = popupContent.style.background;
              
              // Make all elements inside unclickable except for the tour buttons
              const allElements = popupContent.querySelectorAll('*');
              allElements.forEach(el => {
                el.dataset.originalPointerEvents = el.style.pointerEvents;
                el.style.pointerEvents = 'none';
              });
              
              // Add a semi-transparent dark overlay to the popup content
              popupContent.style.position = 'relative';
              
              // Create and append the darkening overlay
              const darkOverlay = document.createElement('div');
              darkOverlay.id = 'popup-dark-overlay';
              darkOverlay.style.position = 'absolute';
              darkOverlay.style.top = '0';
              darkOverlay.style.left = '0';
              darkOverlay.style.width = '100%';
              darkOverlay.style.height = '100%';
              darkOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
              darkOverlay.style.zIndex = '1';
              darkOverlay.style.pointerEvents = 'none';
              popupContent.appendChild(darkOverlay);
            }
            
            // Prevent the popup from closing
            const popup = document.querySelector('.recording-menu-popup') || document.querySelector('.create-note-popup');
            if (popup) {
              popup.dataset.originalPointerEvents = popup.style.pointerEvents;
              popup.style.pointerEvents = 'none';
              // Ensure the popup stays visible
              popup.style.zIndex = '9999';
            }
          },
          hide: () => {
            // Remove the full-screen overlay
            const overlay = document.getElementById('tour-step2-overlay');
            if (overlay) {
              overlay.remove();
            }
            
            // Remove the overlay when step is hidden
            const startBtn = document.querySelector('.recording-start-button');
            if (startBtn) {
              startBtn.style.pointerEvents = '';
            }
            
            // Restore pointer events to all elements and remove dark overlay
            const popupContent = document.querySelector('.popup-content');
            if (popupContent) {
              // Remove the dark overlay
              const darkOverlay = document.getElementById('popup-dark-overlay');
              if (darkOverlay) {
                darkOverlay.remove();
              }
              
              // Restore original properties
              popupContent.style.pointerEvents = popupContent.dataset.originalPointerEvents || '';
              popupContent.style.position = popupContent.dataset.originalPosition || '';
              popupContent.style.background = popupContent.dataset.originalBackground || '';
              
              // Restore pointer events to child elements
              const allElements = popupContent.querySelectorAll('*');
              allElements.forEach(el => {
                el.style.pointerEvents = el.dataset.originalPointerEvents || '';
              });
            }
            
            // Restore popup pointer events
            const popup = document.querySelector('.recording-menu-popup') || document.querySelector('.create-note-popup');
            if (popup) {
              popup.style.pointerEvents = popup.dataset.originalPointerEvents || '';
              // Reset z-index
              popup.style.zIndex = '';
            }
          }
        },
        beforeShowPromise: function() {
          return new Promise(function(resolve) {
            // Make sure popup-content exists before showing the step
            const checkElement = () => {
              if (document.querySelector('.popup-content')) {
                resolve();
              } else {
                setTimeout(checkElement, 100);
              }
            };
            checkElement();
          });
        },
        buttons: [
          {
            text: 'Next',
            action: () => {
              // Close the popup and continue to step 3
              const closeButton = document.querySelector('.close-button');
              if (closeButton) {
                closeButton.click();
                setTimeout(() => {
                  tour.show('microphone-step');
                }, 300);
              } else {
                // If close button not found, try to close popup another way
                const popup = document.querySelector('.recording-menu-popup') || document.querySelector('.create-note-popup');
                if (popup) {
                  popup.click();
                }
                setTimeout(() => {
                  tour.show('microphone-step');
                }, 300);
              }
            }
          }
        ]
      });

      // Step 3: Highlight the microphone button
      tour.addStep({
        id: 'microphone-step',
        title: 'Voice Dictation',
        text: 'The microphone button starts the verbatum dictation feature. Use this only when you want to turn your EXACT words into text.',
        attachTo: {
          element: '#dictation-mic-btn', // Using the ID we added
          on: 'bottom'
        },
        canClickTarget: false, // Prevent clicking the target element
        cancelOnTargetClick: false, // Prevent cancellation when clicking target
        when: {
          show: () => {
            // Create a full-screen overlay to block all clicks
            const fullOverlay = document.createElement('div');
            fullOverlay.className = 'tour-overlay';
            fullOverlay.id = 'tour-step3-overlay';
            fullOverlay.addEventListener('click', (e) => {
              // Prevent clicks from propagating
              e.preventDefault();
              e.stopPropagation();
              return false;
            });
            document.body.appendChild(fullOverlay);
            
            // Disable interaction with the dictation button
            const micButton = document.querySelector('#dictation-mic-btn');
            if (micButton) {
              // Save original properties
              micButton.dataset.originalPointerEvents = micButton.style.pointerEvents;
              micButton.dataset.originalPosition = micButton.style.position;
              micButton.dataset.originalZIndex = micButton.style.zIndex;
              
              // Make the button completely unclickable
              micButton.style.pointerEvents = 'none';
              
              // Add a semi-transparent dark overlay to the button
              const darkOverlay = document.createElement('div');
              darkOverlay.id = 'mic-dark-overlay';
              darkOverlay.style.position = 'absolute';
              darkOverlay.style.top = '0';
              darkOverlay.style.left = '0';
              darkOverlay.style.width = '100%';
              darkOverlay.style.height = '100%';
              darkOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
              darkOverlay.style.zIndex = '1';
              darkOverlay.style.pointerEvents = 'none';
              darkOverlay.style.borderRadius = 'inherit';
              
              // Make sure the button has relative positioning to contain the overlay
              micButton.style.position = 'relative';
              micButton.style.zIndex = '9999'; // Ensure it's visible above other elements
              micButton.appendChild(darkOverlay);
              
              // Disable any click handlers on the button
              const originalClick = micButton.onclick;
              micButton.dataset.originalClick = originalClick;
              micButton.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                return false;
              };
            }
          },
          hide: () => {
            // Remove the full-screen overlay
            const fullOverlay = document.getElementById('tour-step3-overlay');
            if (fullOverlay) {
              fullOverlay.remove();
            }
            
            // Re-enable interaction with the dictation button
            const micButton = document.querySelector('#dictation-mic-btn');
            if (micButton) {
              // Restore original properties
              micButton.style.pointerEvents = micButton.dataset.originalPointerEvents || '';
              micButton.style.position = micButton.dataset.originalPosition || '';
              micButton.style.zIndex = micButton.dataset.originalZIndex || '';
              
              // Remove the dark overlay
              const darkOverlay = document.getElementById('mic-dark-overlay');
              if (darkOverlay) {
                darkOverlay.remove();
              }
              
              // Restore original click handler if it existed
              if (micButton.dataset.originalClick !== undefined) {
                if (micButton.dataset.originalClick === 'null') {
                  micButton.onclick = null;
                } else {
                  try {
                    micButton.onclick = eval(micButton.dataset.originalClick);
                  } catch (e) {
                    micButton.onclick = null;
                  }
                }
              }
            }
          }
        },
        buttons: [
          {
            text: 'Next',
            action: tour.next
          }
        ]
      });

      // Step 4: Highlight the left panel
      tour.addStep({
        id: 'left-panel-step',
        title: 'Notes History',
        text: 'Your notes and transcripts appear here. Easily access your previous conversations and the resulting notes organized by week for quick reference.',
        attachTo: {
          element: '.left-panel',
          on: 'right'
        },
        canClickTarget: false, // Prevent clicking the target element
        cancelOnTargetClick: false, // Prevent cancellation when clicking target
        when: {
          show: () => {
            // Disable interaction with the history panel
            const leftPanel = document.querySelector('.left-panel');
            if (leftPanel) {
              leftPanel.dataset.originalPointerEvents = leftPanel.style.pointerEvents;
              leftPanel.style.pointerEvents = 'none';
              
              // Add a semi-transparent dark overlay to the panel
              const darkOverlay = document.createElement('div');
              darkOverlay.id = 'panel-dark-overlay';
              darkOverlay.style.position = 'absolute';
              darkOverlay.style.top = '0';
              darkOverlay.style.left = '0';
              darkOverlay.style.width = '100%';
              darkOverlay.style.height = '100%';
              darkOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
              darkOverlay.style.zIndex = '1';
              darkOverlay.style.pointerEvents = 'none';
              
              // Make sure the panel has relative positioning to contain the overlay
              leftPanel.dataset.originalPosition = leftPanel.style.position;
              leftPanel.style.position = 'relative';
              leftPanel.appendChild(darkOverlay);
            }
          },
          hide: () => {
            // Re-enable interaction with the history panel
            const leftPanel = document.querySelector('.left-panel');
            if (leftPanel) {
              leftPanel.style.pointerEvents = leftPanel.dataset.originalPointerEvents || '';
              leftPanel.style.position = leftPanel.dataset.originalPosition || '';
              
              // Remove the dark overlay
              const darkOverlay = document.getElementById('panel-dark-overlay');
              if (darkOverlay) {
                darkOverlay.remove();
              }
            }
          }
        },
        buttons: [
          {
            text: 'Next',
            action: tour.next
          }
        ]
      });

      // Check if we're on a mobile device
      const isMobileDevice = () => {
        return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      };

      // For mobile devices, modify step 3 to have a finish button and skip steps 4-6
      if (isMobileDevice()) {
        tour.getById('microphone-step').options.buttons = [
          {
            text: 'Finish',
            action: () => {
              try {
                // Safely complete the tour
                tour.complete();
              } catch (error) {
                console.error('Error completing tour:', error);
                // Ensure tour is marked as seen even if there's an error
                localStorage.setItem('hasSeenAppTour', 'true');
              }
            }
          }
        ];
      }

      // Step 5: Highlight the edit button (only for desktop)
      if (!isMobileDevice()) {
        tour.addStep({
          id: 'edit-button-step',
          title: 'Formatting Tools',
          text: 'The Smart Edit button uses AI technology to make intelligent edits to your notes. Press the pencil button now to see how it works.',
          attachTo: {
            element: '#edit-panel-btn', // Using the ID we added
            on: 'bottom'
          },
          buttons: [], // No buttons - user must click the actual edit button
          advanceOn: { selector: '#edit-panel-btn', event: 'click' } // This will mark step 5 as complete when button is clicked
        });

        // Step 6: Highlight the edit panel after user clicks the edit button
        tour.addStep({
          id: 'edit-panel-step',
          title: 'Edit Panel',
          text: 'By typing instructions into this window and pressing Apply Changes, you can change the note in your Clipboard area in any way you want. That\'s it! If you wish for more guidance we highly recommend our <a href="https://www.youtube.com/watch?v=nIZENIRW3oM&list=PLPvf-I14UfXbsROni5UdeKj4ezLmmnmBg&si=Boj07wDZhJY0PmT1" target="_blank" rel="noopener noreferrer">Youtube tutorials</a> for an easy start.',
          attachTo: {
            element: '.edit-panel', // The edit panel element
            on: 'left'
          },
          buttons: [
            {
              text: 'Finish',
              action: () => {
                try {
                  // Safely complete the tour
                  tour.complete();
                } catch (error) {
                  console.error('Error completing tour:', error);
                  // Ensure tour is marked as seen even if there's an error
                  localStorage.setItem('hasSeenAppTour', 'true');
                }
              }
            }
          ]
        });

        // Listen for when step 5 is completed (user clicked the edit button)
        tour.on('complete', (e) => {
          if (e && e.step && e.step.id === 'edit-button-step') {
            console.log('Step 5 completed - user clicked edit button');
            
            // Wait for the edit panel to appear and then show step 6
            const checkForEditPanel = () => {
              const editPanel = document.querySelector('.edit-panel');
              
              if (editPanel) {
                console.log('Edit panel found, showing step 6');
                // Ensure DOM is fully rendered before showing the step
                setTimeout(() => {
                  // Verify element still exists before showing step
                  if (document.querySelector('.edit-panel')) {
                    tour.show('edit-panel-step');
                  } else {
                    console.warn('Edit panel disappeared before tour could show');
                    tour.complete(); // Complete the tour if edit panel disappeared
                  }
                }, 500); // Delay to ensure DOM is ready
              } else {
                // Keep checking until edit panel appears (with a timeout)
                setTimeout(checkForEditPanel, 100);
              }
            };
            
            // Start checking for the edit panel
            setTimeout(checkForEditPanel, 100);
          }
        });
      }

      // Function to clean up any remaining tour effects, especially for the dictation mic button
      const cleanupTourEffects = () => {
        console.log('Cleaning up tour effects');
        
        // Clean up dictation mic button
        const micButton = document.querySelector('#dictation-mic-btn');
        if (micButton) {
          // Restore original properties
          micButton.style.pointerEvents = micButton.dataset.originalPointerEvents || '';
          micButton.style.position = micButton.dataset.originalPosition || '';
          micButton.style.zIndex = micButton.dataset.originalZIndex || '';
          
          // Remove the dark overlay
          const darkOverlay = document.getElementById('mic-dark-overlay');
          if (darkOverlay) {
            darkOverlay.remove();
          }
          
          // Restore original click handler if it existed
          if (micButton.dataset.originalClick !== undefined) {
            if (micButton.dataset.originalClick === 'null') {
              micButton.onclick = null;
            } else {
              try {
                micButton.onclick = eval(micButton.dataset.originalClick);
              } catch (e) {
                micButton.onclick = null;
              }
            }
          }
        }
        
        // STEP 2 SPECIFIC CLEANUP - Ensure popup content is restored
        const popupContent = document.querySelector('.popup-content');
        if (popupContent) {
          // Remove the dark overlay
          const darkOverlay = document.getElementById('popup-dark-overlay');
          if (darkOverlay) {
            darkOverlay.remove();
          }
          
          // Restore original properties
          popupContent.style.pointerEvents = popupContent.dataset.originalPointerEvents || '';
          popupContent.style.position = popupContent.dataset.originalPosition || '';
          popupContent.style.background = popupContent.dataset.originalBackground || '';
          
          // Restore pointer events to child elements
          const allElements = popupContent.querySelectorAll('*');
          allElements.forEach(el => {
            el.style.pointerEvents = el.dataset.originalPointerEvents || '';
          });
        }
        
        // Restore popup pointer events
        const popup = document.querySelector('.recording-menu-popup') || document.querySelector('.create-note-popup');
        if (popup) {
          popup.style.pointerEvents = popup.dataset.originalPointerEvents || '';
          popup.style.zIndex = '';
        }
        
        // Remove left panel overlay
        const leftPanel = document.querySelector('.left-panel');
        if (leftPanel) {
          leftPanel.style.pointerEvents = leftPanel.dataset.originalPointerEvents || '';
          leftPanel.style.position = leftPanel.dataset.originalPosition || '';
          
          const panelDarkOverlay = document.getElementById('panel-dark-overlay');
          if (panelDarkOverlay) {
            panelDarkOverlay.remove();
          }
        }
        
        // Remove ANY and ALL tour-related overlays
        const overlayIds = [
          'tour-step3-overlay',
          'tour-step2-overlay',
          'panel-dark-overlay',
          'popup-dark-overlay',
          'mic-dark-overlay'
        ];
        
        overlayIds.forEach(id => {
          const overlay = document.getElementById(id);
          if (overlay) {
            overlay.remove();
          }
        });
        
        // Remove ALL elements with tour-overlay class
        const allTourOverlays = document.querySelectorAll('.tour-overlay');
        allTourOverlays.forEach(overlay => {
          overlay.remove();
        });
        
        // Remove shepherd overlay
        const shepherdOverlay = document.querySelector('.shepherd-modal-overlay-container');
        if (shepherdOverlay) {
          shepherdOverlay.remove();
        }
      };
      
      // Safe event handler for tour completion
      tour.on('complete', () => {
        console.log('Tour completed');
        localStorage.setItem('hasSeenAppTour', 'true');
        cleanupTourEffects();
      });
      
      // Safe event handler for tour cancellation
      tour.on('cancel', () => {
        console.log('Tour cancelled');
        localStorage.setItem('hasSeenAppTour', 'true'); // Also set flag if user cancels
        cleanupTourEffects();
      });
      
      // Add error handling for any tour errors
      tour.on('error', (error) => {
        console.error('Tour error:', error);
        // Still mark the tour as seen even if there's an error
        localStorage.setItem('hasSeenAppTour', 'true');
        // Clean up any tour effects even when there's an error
        cleanupTourEffects();
      });
      
      // Handle step navigation - ensure cleanup between steps
      tour.on('hide', () => {
        console.log('Step hidden');
        // This ensures that any step-specific overlays are removed
        // even if the step's own hide handler fails
        setTimeout(cleanupTourEffects, 50); // Small delay to let the step's hide handler run first
      });
      
      // Ensure cleanup on Escape key - cancel the tour completely
      const handleEscapeKey = (e) => {
        if (e.key === 'Escape' && tour.isActive()) {
          console.log('Escape key pressed - abandoning tour');
          try {
            tour.cancel(); // This will trigger the 'cancel' event which handles cleanup
          } catch (error) {
            console.error('Error cancelling tour:', error);
            cleanupTourEffects();
            localStorage.setItem('hasSeenAppTour', 'true');
          }
        }
      };
      document.addEventListener('keydown', handleEscapeKey);
      
      // Ensure buttons in tour use clean exit
      document.addEventListener('click', (e) => {
        // Check if clicked element is a shepherd cancel button
        if (e.target.closest('.shepherd-cancel-icon')) {
          console.log('Tour cancel button clicked');
          setTimeout(cleanupTourEffects, 100);
        }
      }, true);

      // Ensure the button is rendered before starting the tour
      // Add a small delay to allow the DOM to update
      const startTourTimeout = setTimeout(() => {
        if (document.querySelector('#new-note-btn')) {
          tour.start();
        } else {
          console.warn('Shepherd tour: #new-note-btn not found yet.');
          // Optionally try again or handle the case where the button never appears
        }
      }, 500); // Adjust delay as needed

      return () => {
        // Cleanup timeout on unmount
        clearTimeout(startTourTimeout);
        
        // Remove event listener
        document.removeEventListener('keydown', handleEscapeKey);
        
        // Make sure to clean up any tour effects when component unmounts
        try {
          if (tour.isActive()) {
            tour.cancel();
          }
          cleanupTourEffects();
        } catch (error) {
          console.error('Error cleaning up tour effects:', error);
        }
      };
    }
  }, []); // Empty dependency array ensures this runs only once on mount

  // This component doesn't render anything visible
  return null;
}

export default IntroTour;
