import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RealtimeTranscriber } from 'assemblyai';
import RecordRTC from 'recordrtc';
import NoSleep from 'nosleep.js';
import './Recording.css';
import { generateClient } from 'aws-amplify/api';
import * as queries from '../../graphql/queries';
import * as mutations from '../../graphql/mutations';
import { getCurrentUser } from 'aws-amplify/auth';

const client = generateClient();

// Constants
const TOKEN_REFRESH_BUFFER_MINUTES = 10;
const TOKEN_EXPIRY_HOURS = 2.9; // Just under 3 hours to be safe
const HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds
const RECORDER_TIME_SLICE_MS = 250;

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
  
  // Refs
  const rtRef = useRef(null);
  const recorder = useRef(null);
  const streamRef = useRef(null);
  const noSleepRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const tokenRefreshTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const textsRef = useRef({});
  
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
    
    if (rtRef.current) {
      rtRef.current.close();
      rtRef.current = null;
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
    } catch (error) {
      console.error("[Dictation] Error updating user subscription:", error);
    }
  };
  
  // Setup heartbeat to keep connection alive
  const setupHeartbeat = useCallback(() => {
    clearInterval(heartbeatIntervalRef.current);
    
    console.log('[Dictation] Setting up heartbeat');
    
    heartbeatIntervalRef.current = setInterval(() => {
      if (rtRef.current) {
        console.log('[Dictation] Sending heartbeat');
        
        try {
          // Send a tiny empty buffer as a ping
          const emptyBuffer = new ArrayBuffer(2);
          rtRef.current.sendAudio(emptyBuffer);
        } catch (error) {
          console.error('[Dictation] Error sending heartbeat:', error);
        }
      } else {
        console.log('[Dictation] Skipping heartbeat - connection not available');
      }
    }, HEARTBEAT_INTERVAL_MS);
    
    // Send an immediate heartbeat after a small delay
    setTimeout(() => {
      if (rtRef.current) {
        try {
          const emptyBuffer = new ArrayBuffer(2);
          rtRef.current.sendAudio(emptyBuffer);
          console.log('[Dictation] Initial interval heartbeat sent successfully');
        } catch (error) {
          console.error('[Dictation] Error sending initial interval heartbeat:', error);
        }
      }
    }, 300); // 300ms delay
  }, []);
  
  // Setup transcription connection
  const setupTranscriptionConnection = async (newToken) => {
    if (rtRef.current) {
      console.log('[Dictation] Closing existing connection before setup');
      rtRef.current.close();
      rtRef.current = null;
    }
    
    console.log('[Dictation] Setting up transcription connection');
    
    return new Promise((resolve, reject) => {
      try {
        rtRef.current = new RealtimeTranscriber({
          token: newToken,
          sampleRate: 16000,
          endUtteranceSilenceThreshold: 1500,
        });
        
        // Setup event handlers
        rtRef.current.on('open', () => {
          if (!rtRef.current) {
            console.error('[Dictation] Connection reference is null in open event handler');
            return;
          }
          
          console.log('[Dictation] Connection established');
          
          // Setup heartbeat
          setupHeartbeat();
          
          setStatus(prev => ({ ...prev, isTranscriberReady: true }));
          resolve();
          
          // Send initial ping with a small delay to ensure connection is fully ready
          setTimeout(() => {
            try {
              if (rtRef.current) {
                const emptyBuffer = new ArrayBuffer(2);
                rtRef.current.sendAudio(emptyBuffer);
                console.log('[Dictation] Initial heartbeat sent successfully');
              }
            } catch (error) {
              console.error('[Dictation] Error sending initial audio buffer:', error);
            }
          }, 500); // 500ms delay
        });
        
        rtRef.current.on('error', (err) => {
          console.error('[Dictation] Connection error:', err);
          setStatus(prev => ({ ...prev, isTranscriberReady: false }));
          reject(err);
        });
        
        rtRef.current.on('close', () => {
          console.log('[Dictation] Connection closed');
          setStatus(prev => ({ ...prev, isTranscriberReady: false }));
          
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        });
        
        // Setup transcript handler
        textsRef.current = {};
        rtRef.current.on("transcript", (message) => {
          textsRef.current[message.audio_start] = message.text;
          const sortedTexts = Object.entries(textsRef.current)
            .sort(([a], [b]) => a - b)
            .map(([, text]) => text)
            .join(' ');
          
          setTranscription(sortedTexts);
          setClipboardContent(sortedTexts);
        });
        
        // Connect to the service
        rtRef.current.connect();
      } catch (error) {
        console.error('[Dictation] Error setting up connection:', error);
        setStatus(prev => ({ ...prev, isTranscriberReady: false }));
        reject(error);
      }
    });
  };
  
  // Refresh transcription connection with new token
  const refreshTranscriptionConnection = async (newToken) => {
    console.log('[Dictation] Refreshing connection with new token');
    await setupTranscriptionConnection(newToken);
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
          alert('You have no remaining dictation hours. Please upgrade your subscription.');
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
          channelCount: 2,
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
        mimeType: mimeType,
        recorderType: recorderType,
        timeSlice: RECORDER_TIME_SLICE_MS,
        desiredSampRate: 16000,
        numberOfAudioChannels: 1,
        bufferSize: 4096,
        audioBitsPerSecond: 128000,
        ondataavailable: async (blob) => {
          if (!rtRef.current) return;
          const buffer = await blob.arrayBuffer();
          rtRef.current.sendAudio(buffer);
        },
      });
      
      // Start recording
      console.log('[Dictation] Starting recording');
      recorder.current.startRecording();
      
      setStatus(prev => ({ 
        ...prev, 
        isTranscribing: true,
        isLoading: false,
        isQueued: false
      }));
      
      if (noSleepRef.current) {
        noSleepRef.current.enable();
      }
      
      // Add a space to the clipboard to remove placeholder
      setClipboardContent(" ");
      
      startTimer();
      console.log('[Dictation] Dictation started successfully');
    } catch (error) {
      console.error('[Dictation] Error starting dictation:', error);
      setStatus(prev => ({ 
        ...prev, 
        isLoading: false,
        isQueued: false
      }));
      alert('Failed to start dictation. Please try again.');
    }
  };
  
  // Stop dictation
  const stopDictation = () => {
    if (recorder.current && recorder.current.state !== 'stopped') {
      console.log('[Dictation] Stopping dictation');
      setStatus(prev => ({ ...prev, isStopping: true }));
      
      // Pause heartbeats while stopping
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      
      // Capture the current transcription
      const finalTranscription = transcription;
      
      // Update states immediately to prevent race conditions
      setStatus(prev => ({ 
        ...prev, 
        isTranscribing: false,
        isTranscriberReady: false
      }));
      
      recorder.current.stopRecording(() => {
        if (noSleepRef.current) {
          noSleepRef.current.disable();
        }
        
        stopTimer();
        
        const hoursUsed = timer / 3600; // Convert seconds to hours
        updateUserSubscriptionHours(hoursUsed);
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        
        // Close the WebSocket connection
        if (rtRef.current) {
          console.log('[Dictation] Closing WebSocket connection');
          rtRef.current.close();
          rtRef.current = null;
        }
        
        // Send final transcription to parent component
        if (finalTranscription) {
          console.log('[Dictation] Sending final transcription to parent');
          onTextStreamUpdate(finalTranscription);
        }
        
        // Re-initialize after a brief delay
        setTimeout(async () => {
          console.log('[Dictation] Re-initializing connection after stop');
          
          // Force loading state to false
          setStatus(prev => ({ ...prev, isLoading: false }));
          
          // Handle queued dictation request if any
          if (status.isQueued) {
            console.log('[Dictation] Processing queued dictation request');
            setStatus(prev => ({ ...prev, isStopping: false }));
            setTimeout(() => {
              startDictation();
            }, 500);
            return;
          }
          
          // Otherwise, proceed with normal re-initialization
          try {
            setStatus(prev => ({ ...prev, isLoading: true }));
            
            // Get a fresh token if needed
            let currentToken = token.value;
            if (!isTokenValid()) {
              currentToken = await fetchAssemblyAIToken();
            }
            
            // Setup new connection
            if (currentToken) {
              await setupTranscriptionConnection(currentToken);
              console.log('[Dictation] New connection established');
            } else {
              console.error('[Dictation] No valid token for re-initialization');
            }
          } catch (error) {
            console.error('[Dictation] Error during re-initialization:', error);
          } finally {
            setStatus(prev => ({ 
              ...prev, 
              isLoading: false,
              isStopping: false
            }));
          }
        }, 1000);
      });
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
  
  return {
    isDictationLoading: status.isLoading,
    isTranscribing: status.isTranscribing,
    isInitialized: status.isInitialized,
    isTranscriberReady: status.isTranscriberReady,
    dictationQueued: status.isQueued,
    isStoppingDictation: status.isStopping,
    startDictation,
    stopDictation,
    toggleDictation
  };
};

export default Dictation;