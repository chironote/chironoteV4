import React, { useState, useRef, useEffect, useCallback } from 'react';
import RecordRTC from 'recordrtc';
import NoSleep from 'nosleep.js';
import './Recording.css';
import { generateClient } from 'aws-amplify/api';
import * as queries from '../../graphql/queries';
import * as mutations from '../../graphql/mutations';
import { getCurrentUser } from 'aws-amplify/auth';
import CreditPopup from './CreditLimit';

const client = generateClient();

// Constants
const TOKEN_REFRESH_BUFFER_MINUTES = 10;
const TOKEN_EXPIRY_HOURS = 2.9; // Just under 3 hours to be safe
const HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds
const RECORDER_TIME_SLICE_MS = 250;
const WEBSOCKET_URL = 'wss://streaming.assemblyai.com/v3';

const Dictation = ({ 
  onTextStreamUpdate,
  setClipboardContent,
  username
}) => {
  // State for dictation status
  const [status, setStatus] = useState({
    isLoading: false,
    isTranscribing: false,
    isInitialized: false,
    isTranscriberReady: false,
    isQueued: false,
    isStopping: false
  });
  
  // State for data
  const [transcription, setTranscription] = useState('');
  const [token, setToken] = useState({
    value: null,
    expiry: null
  });
  const [subscription, setSubscription] = useState({
    data: null,
    hasHours: false
  });
  const [timer, setTimer] = useState(0);
  const [showCreditPopup, setShowCreditPopup] = useState(false);
  
  // Refs
  const wsRef = useRef(null);
  const recorder = useRef(null);
  const streamRef = useRef(null);
  const noSleepRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const tokenRefreshTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const textsRef = useRef({});
  const sessionIdRef = useRef(null);
  
  // Initialize NoSleep to prevent device from sleeping during dictation
  useEffect(() => {
    noSleepRef.current = new NoSleep();
    return () => {
      if (noSleepRef.current) {
        noSleepRef.current.disable();
      }
    };
  }, []);
  
  // Cleanup all resources on component unmount
  useEffect(() => {
    return () => cleanupResources();
  }, []);
  
  // Initialize dictation on component mount
  useEffect(() => {
    const initializeDictation = async () => {
      console.log('[Dictation] Starting initialization');
      
      try {
        // Get token and user subscription in parallel
        const [newToken] = await Promise.all([
          fetchAssemblyAIToken(),
          fetchUserSubscription()
        ]);
        
        // Setup transcription connection in advance
        if (newToken) {
          await setupTranscriptionConnection(newToken);
        }
        
        setStatus(prev => ({ ...prev, isInitialized: true }));
        console.log('[Dictation] Initialization complete');
      } catch (error) {
        console.error('[Dictation] Initialization error:', error);
      }
    };
    
    initializeDictation();
    
    return () => {
      clearTimeout(tokenRefreshTimeoutRef.current);
      clearInterval(heartbeatIntervalRef.current);
    };
  }, []);
  
  // Check token expiry and refresh if needed
  useEffect(() => {
    const checkTokenInterval = setInterval(() => {
      if (isTokenExpiring()) {
        fetchAssemblyAIToken().then(newToken => {
          if (newToken && status.isTranscriberReady && !status.isTranscribing) {
            refreshTranscriptionConnection(newToken);
          }
        });
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(checkTokenInterval);
  }, [token.expiry, status.isTranscriberReady, status.isTranscribing]);
  
  // Update subscription status when subscription data changes
  useEffect(() => {
    if (subscription.data) {
      setSubscription(prev => ({
        ...prev,
        hasHours: subscription.data.hoursleft > 0
      }));
    }
  }, [subscription.data]);
  
  // Process queued dictation requests when ready
  useEffect(() => {
    const { isLoading, isStopping, isQueued, isTranscribing } = status;
    
    if (!isLoading && !isStopping && isQueued && !isTranscribing) {
      console.log('[Dictation] Executing queued dictation request');
      setTimeout(() => {
        startDictation();
      }, 500);
    }
  }, [status.isLoading, status.isStopping, status.isQueued, status.isTranscribing]);
  
  // Helper function to check if token is expiring soon
  const isTokenExpiring = useCallback(() => {
    if (!token.value || !token.expiry) return true;
    
    const now = new Date();
    return (token.expiry.getTime() - now.getTime() < TOKEN_REFRESH_BUFFER_MINUTES * 60 * 1000);
  }, [token]);
  
  // Helper function to check if token is valid
  const isTokenValid = useCallback(() => {
    if (!token.value || !token.expiry) return false;
    
    const now = new Date();
    return now < token.expiry;
  }, [token]);
  
  // Cleanup all resources
  const cleanupResources = useCallback(() => {
    if (recorder.current && recorder.current.state !== 'stopped') {
      recorder.current.stopRecording();
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (noSleepRef.current) {
      noSleepRef.current.disable();
    }
    
    stopTimer();
    
    clearTimeout(tokenRefreshTimeoutRef.current);
    clearInterval(heartbeatIntervalRef.current);
    heartbeatIntervalRef.current = null;
  }, []);
  
  // Fetch AssemblyAI token
  const fetchAssemblyAIToken = async () => {
    try {
      console.log('[Dictation] Fetching AssemblyAI token');
      
      const response = await fetch('https://llck5m4mzd6sa6do3joadjzzs40jtoef.lambda-url.us-east-2.on.aws');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const { token: newToken } = await response.json();
      const now = new Date();
      const expiry = new Date(now.getTime() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
      
      setToken({ value: newToken, expiry });
      scheduleTokenRefresh(expiry);
      
      console.log('[Dictation] Token fetched successfully');
      return newToken;
    } catch (error) {
      console.error('[Dictation] Error fetching AssemblyAI token:', error);
      return null;
    }
  };
  
  // Schedule token refresh
  const scheduleTokenRefresh = (expiry) => {
    clearTimeout(tokenRefreshTimeoutRef.current);
    
    const now = new Date();
    const timeUntilRefresh = expiry.getTime() - now.getTime();
    
    if (timeUntilRefresh > 0) {
      tokenRefreshTimeoutRef.current = setTimeout(() => {
        fetchAssemblyAIToken();
      }, timeUntilRefresh);
    } else {
      fetchAssemblyAIToken();
    }
  };
  
  // Fetch user subscription data
  const fetchUserSubscription = async () => {
    try {
      console.log('[Dictation] Fetching user subscription');
      
      const user = await getCurrentUser();
      const owner = username || user.username;
      const subscriptionData = await client.graphql({
        query: queries.getUserSubscription,
        variables: { owner }
      });
      
      const userData = subscriptionData.data.getUserSubscription;
      setSubscription({
        data: userData,
        hasHours: userData ? userData.hoursleft > 0 : false
      });
      
      console.log('[Dictation] Subscription fetched successfully');
      return userData;
    } catch (error) {
      console.error('[Dictation] Error fetching user subscription:', error);
      return null;
    }
  };
  
  // Update user subscription hours
  const updateUserSubscriptionHours = async (hoursUsed) => {
    try {
      const user = await getCurrentUser();
      const owner = username || user.username;
      
      const updatedSubscription = await client.graphql({
        query: mutations.updateUserSubscription,
        variables: {
          input: {
            owner,
            hoursleft: subscription.data.hoursleft - hoursUsed
          }
        }
      });
      
      setSubscription({
        data: updatedSubscription.data.updateUserSubscription,
        hasHours: updatedSubscription.data.updateUserSubscription.hoursleft > 0
      });
      
      console.log('[Dictation] Subscription hours updated successfully');
    } catch (error) {
      console.error('[Dictation] Error updating user subscription:', error);
    }
  };
  
  // Setup heartbeat to keep connection alive
  const setupHeartbeat = useCallback(() => {
    clearInterval(heartbeatIntervalRef.current);
    
    console.log('[Dictation] Setting up heartbeat for V3 WebSocket');
    
    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        console.log('[Dictation] Sending heartbeat ping');
        
        try {
          // Send a ping message to keep connection alive
          wsRef.current.send(JSON.stringify({ type: 'ping' }));
        } catch (error) {
          console.error('[Dictation] Error sending heartbeat:', error);
        }
      } else {
        console.log('[Dictation] Skipping heartbeat - connection not available');
      }
    }, HEARTBEAT_INTERVAL_MS);
  }, []);
  
  // Setup transcription connection with V3 WebSocket
  const setupTranscriptionConnection = async (newToken) => {
    if (wsRef.current) {
      console.log('[Dictation] Closing existing WebSocket connection before setup');
      try {
        wsRef.current.close();
      } catch (error) {
        console.error('[Dictation] Error closing existing connection:', error);
      }
      wsRef.current = null;
    }
    
    console.log('[Dictation] Setting up V3 WebSocket transcription connection');
    
    return new Promise((resolve, reject) => {
      try {
        // Create WebSocket connection with token as query parameter
        const wsUrl = `${WEBSOCKET_URL}?token=${newToken}`;
        wsRef.current = new WebSocket(wsUrl);
        
        // Generate unique session ID
        sessionIdRef.current = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        wsRef.current.onopen = () => {
          console.log('[Dictation] V3 WebSocket connection established');
          
          // Send session configuration
          const configMessage = {
            type: 'session_begins',
            session_id: sessionIdRef.current,
            audio_format: {
              encoding: 'pcm_s16le',
              sample_rate: 16000,
              channels: 1
            },
            end_utterance_silence_threshold: 1500
          };
          
          wsRef.current.send(JSON.stringify(configMessage));
          
          // Setup heartbeat
          setupHeartbeat();
          
          setStatus(prev => ({ ...prev, isTranscriberReady: true }));
          resolve();
        };
        
        wsRef.current.onerror = (error) => {
          console.error('[Dictation] V3 WebSocket error:', error);
          setStatus(prev => ({ ...prev, isTranscriberReady: false }));
          reject(error);
        };
        
        wsRef.current.onclose = (event) => {
          console.log('[Dictation] V3 WebSocket connection closed:', event.code, event.reason);
          setStatus(prev => ({ ...prev, isTranscriberReady: false }));
          
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
          
          // Attempt to reconnect if not actively stopping
          if (!status.isStopping && !status.isLoading && event.code !== 1000) {
            console.log('[Dictation] Connection closed unexpectedly, will attempt reconnection');
            setTimeout(async () => {
              try {
                let currentToken = token.value;
                if (!isTokenValid()) {
                  console.log('[Dictation] Token invalid, fetching new token for reconnection');
                  currentToken = await fetchAssemblyAIToken();
                }
                
                if (currentToken) {
                  console.log('[Dictation] Attempting to reconnect after unexpected close');
                  await setupTranscriptionConnection(currentToken);
                  console.log('[Dictation] Successfully reconnected after unexpected close');
                }
              } catch (error) {
                console.error('[Dictation] Failed to reconnect after unexpected close:', error);
              }
            }, 2000);
          }
        };
        
        wsRef.current.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            switch (message.type) {
              case 'partial_transcript':
                // Handle partial transcripts (real-time updates)
                if (message.text) {
                  textsRef.current[message.audio_start || Date.now()] = message.text;
                  const sortedTexts = Object.entries(textsRef.current)
                    .sort(([a], [b]) => parseFloat(a) - parseFloat(b))
                    .map(([, text]) => text)
                    .join(' ');
                  
                  setTranscription(sortedTexts);
                  setClipboardContent(sortedTexts);
                }
                break;
                
              case 'final_transcript':
                // Handle final transcripts
                if (message.text) {
                  textsRef.current[message.audio_start || Date.now()] = message.text;
                  const sortedTexts = Object.entries(textsRef.current)
                    .sort(([a], [b]) => parseFloat(a) - parseFloat(b))
                    .map(([, text]) => text)
                    .join(' ');
                  
                  setTranscription(sortedTexts);
                  setClipboardContent(sortedTexts);
                }
                break;
                
              case 'session_information':
                console.log('[Dictation] Session information:', message);
                break;
                
              case 'error':
                console.error('[Dictation] V3 API error:', message.error);
                break;
                
              default:
                console.log('[Dictation] Unknown message type:', message.type);
            }
          } catch (error) {
            console.error('[Dictation] Error processing V3 message:', error);
          }
        };
        
      } catch (error) {
        console.error('[Dictation] Error setting up V3 WebSocket connection:', error);
        setStatus(prev => ({ ...prev, isTranscriberReady: false }));
        reject(error);
      }
    });
  };
  
  // Refresh transcription connection with new token
  const refreshTranscriptionConnection = async (newToken) => {
    console.log('[Dictation] Refreshing connection with new token');
    try {
      await setupTranscriptionConnection(newToken);
    } catch (error) {
      console.error('[Dictation] Error refreshing connection:', error);
    }
  };
  
  // Timer functions
  const startTimer = useCallback(() => {
    setTimer(0);
    timerIntervalRef.current = setInterval(() => {
      setTimer(prevTimer => prevTimer + 1);
    }, 1000);
  }, []);
  
  const stopTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
  }, []);
  
  // Handle closing the credit popup
  const handleCloseCreditPopup = () => {
    setShowCreditPopup(false);
  };
  
  // Start dictation
  const startDictation = async () => {
    // If already loading or stopping, queue the action
    if (status.isLoading || status.isStopping) {
      console.log(`[Dictation] Already ${status.isStopping ? 'stopping' : 'loading'}, queuing action`);
      setStatus(prev => ({ ...prev, isQueued: true }));
      return;
    }
    
    try {
      console.log('[Dictation] Starting dictation');
      setStatus(prev => ({ ...prev, isLoading: true }));
      setClipboardContent("");
      textsRef.current = {};
      
      // Check subscription
      if (!subscription.hasHours) {
        console.log('[Dictation] No subscription detected, checking again');
        
        const updatedSubscription = await fetchUserSubscription();
        if (!updatedSubscription || updatedSubscription.hoursleft <= 0) {
          console.error('[Dictation] User has no remaining hours');
          setShowCreditPopup(true);
          setStatus(prev => ({ ...prev, isLoading: false }));
          return;
        }
      }
      
      // Check if token is valid and transcriber is ready
      if (!isTokenValid() || !status.isTranscriberReady) {
        console.log('[Dictation] Token invalid or transcriber not ready, setting up connection');
        
        // Get a fresh token if needed
        let currentToken = token.value;
        if (!isTokenValid()) {
          currentToken = await fetchAssemblyAIToken();
        }
        
        // Setup transcription connection if not ready
        if (!status.isTranscriberReady) {
          await setupTranscriptionConnection(currentToken);
        }
      } else {
        console.log('[Dictation] Using existing connection');
        
        // Ensure heartbeat is running
        if (!heartbeatIntervalRef.current) {
          console.log('[Dictation] Restarting heartbeat for existing connection');
          setupHeartbeat();
        }
      }
      
      // Request mic access
      console.log('[Dictation] Requesting microphone access');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        }
      });
      streamRef.current = stream;
      
      // Configure recorder
      console.log('[Dictation] Configuring recorder');
      
      const isIOS = /iphone|ipad/i.test(navigator.userAgent.toLowerCase());
      const mimeType = isIOS ? 'audio/wav;codecs=pcm' : 'audio/webm;codecs=pcm';
      const recorderType = RecordRTC.StereoAudioRecorder;
      
      recorder.current = new RecordRTC(stream, {
        type: 'audio',
        mimeType: 'audio/wav',
        recorderType: RecordRTC.StereoAudioRecorder,
        numberOfAudioChannels: 1,
        desiredSampRate: 16000,
        timeSlice: RECORDER_TIME_SLICE_MS,
        ondataavailable: (blob) => {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && status.isTranscribing) {
            blob.arrayBuffer().then(buffer => {
              // Convert ArrayBuffer to base64 for V3 JSON format
              const uint8Array = new Uint8Array(buffer);
              const base64Audio = btoa(String.fromCharCode.apply(null, uint8Array));
              
              const audioMessage = {
                type: 'audio_data',
                audio_data: base64Audio
              };
              
              wsRef.current.send(JSON.stringify(audioMessage));
            }).catch(error => {
              console.error('[Dictation] Error converting blob to buffer:', error);
            });
          }
        }
      });
      // Start recording and sending audio
      console.log('[Dictation] Starting audio recording');
      recorder.current.startRecording();
      
      // Enable NoSleep to prevent device from sleeping
      if (noSleepRef.current) {
        noSleepRef.current.enable();
      }
      
      // Start timer
      startTimer();
      
      setStatus(prev => ({ 
        ...prev, 
        isTranscribing: true, 
        isLoading: false, 
        isQueued: false 
      }));
      
      console.log('[Dictation] V3 dictation started successfully');
    } catch (error) {
      console.error('[Dictation] Error starting dictation:', error);
      setStatus(prev => ({ ...prev, isLoading: false, isQueued: false }));
      alert('Failed to start dictation. Please try again.');
    }
  };
  
  // Stop dictation
  const stopDictation = async () => {
    if (status.isStopping) {
      console.log('[Dictation] Already stopping');
      return;
    }
    
    console.log('[Dictation] Stopping V3 dictation');
    setStatus(prev => ({ ...prev, isStopping: true }));
    
    try {
      // Stop recording
      if (recorder.current && recorder.current.state !== 'stopped') {
        console.log('[Dictation] Stopping recorder');
        recorder.current.stopRecording();
      }
      
      // Send session termination message to V3 API
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        const terminateMessage = {
          type: 'session_terminate'
        };
        wsRef.current.send(JSON.stringify(terminateMessage));
      }
      
      // Stop media stream
      if (streamRef.current) {
        console.log('[Dictation] Stopping media stream');
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      // Disable NoSleep
      if (noSleepRef.current) {
        noSleepRef.current.disable();
      }
      
      // Stop timer and calculate hours used
      stopTimer();
      const hoursUsed = timer / 3600; // Convert seconds to hours
      
      // Update subscription hours
      if (hoursUsed > 0) {
        await updateUserSubscriptionHours(hoursUsed);
      }
      
      // Send final transcription to parent component
      if (transcription) {
        console.log('[Dictation] Sending final transcription to parent');
        onTextStreamUpdate(transcription);
      }
      
      setStatus(prev => ({ 
        ...prev, 
        isTranscribing: false, 
        isStopping: false,
        isQueued: false
      }));
      
      console.log('[Dictation] V3 dictation stopped successfully');
    } catch (error) {
      console.error('[Dictation] Error stopping dictation:', error);
      setStatus(prev => ({ ...prev, isStopping: false }));
    }
  };
  
  // Toggle dictation state
  const toggleDictation = () => {
    if (status.isTranscribing || status.isStopping) {
      stopDictation();
    } else {
      startDictation();
    }
  };
  
  // Render the CreditPopup component if showCreditPopup is true
  const creditPopupElement = showCreditPopup ? (
    <div className="create-note-popup">
      <div className="credit-limit-container popup-content" onClick={(e) => e.stopPropagation()}>
        <CreditPopup onClose={handleCloseCreditPopup} />
      </div>
    </div>
  ) : null;
  
  return {
    isDictationLoading: status.isLoading,
    isTranscribing: status.isTranscribing,
    isInitialized: status.isInitialized,
    isTranscriberReady: status.isTranscriberReady,
    dictationQueued: status.isQueued,
    isStoppingDictation: status.isStopping,
    creditPopupElement,
    startDictation,
    stopDictation,
    toggleDictation
  };
};

export default Dictation;