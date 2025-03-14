import React, { useState, useRef, useEffect } from 'react';
import { RealtimeTranscriber } from 'assemblyai';
import RecordRTC from 'recordrtc';
import NoSleep from 'nosleep.js';
import './Recording.css';
import { generateClient } from 'aws-amplify/api';
import * as queries from '../../graphql/queries';
import * as mutations from '../../graphql/mutations';
import { getCurrentUser } from 'aws-amplify/auth';

const client = generateClient();

const Dictation = ({ 
  onTextStreamUpdate,
  setClipboardContent,
  username
}) => {
  // State variables
  const [isDictationLoading, setIsDictationLoading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [assemblyAIToken, setAssemblyAIToken] = useState(null);
  const [tokenExpiry, setTokenExpiry] = useState(null);
  const [userSubscription, setUserSubscription] = useState(null);
  const [timer, setTimer] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [isTranscriberReady, setIsTranscriberReady] = useState(false);
  const [dictationQueued, setDictationQueued] = useState(false);
  const [isStoppingDictation, setIsStoppingDictation] = useState(false);

  // Refs
  const rtRef = useRef(null);
  const recorder = useRef(null);
  const streamRef = useRef(null);
  const noSleepRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const tokenRefreshTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const textsRef = useRef({});

  // Initialize NoSleep
  useEffect(() => {
    noSleepRef.current = new NoSleep();
    return () => {
      if (noSleepRef.current) {
        noSleepRef.current.disable();
      }
    };
  }, []);

  // Preload all necessary resources on component mount
  useEffect(() => {
    const initializeDictation = async () => {
      console.log(' [Dictation] Starting initialization process');
      const startTime = performance.now();
      
      try {
        // Get token and user subscription in parallel
        const [token] = await Promise.all([
          fetchAssemblyAIToken(),
          fetchUserSubscription()
        ]);
        
        // Setup transcription connection in advance
        if (token) {
          await setupTranscriptionConnection(token);
        }
        
        const endTime = performance.now();
        console.log(` [Dictation] Initialization complete in ${(endTime - startTime).toFixed(2)}ms`);
        setIsInitialized(true);
      } catch (error) {
        console.error(' [Dictation] Initialization error:', error);
      }
    };
    
    initializeDictation();
    
    return () => {
      if (tokenRefreshTimeoutRef.current) {
        clearTimeout(tokenRefreshTimeoutRef.current);
      }
      
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupResources();
    };
  }, []);

  const cleanupResources = () => {
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
    
    if (tokenRefreshTimeoutRef.current) {
      clearTimeout(tokenRefreshTimeoutRef.current);
    }
    
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  };

  // Check if token needs refresh every minute
  useEffect(() => {
    const checkTokenInterval = setInterval(() => {
      const now = new Date();
      // Refresh token if it expires in less than 10 minutes
      if (tokenExpiry && (tokenExpiry.getTime() - now.getTime() < 10 * 60 * 1000)) {
        fetchAssemblyAIToken().then(token => {
          if (token && isTranscriberReady && !isTranscribing) {
            // If transcriber is already set up but not actively transcribing,
            // refresh the connection with the new token
            refreshTranscriptionConnection(token);
          }
        });
      }
    }, 60 * 1000); // Check every minute
    
    return () => {
      clearInterval(checkTokenInterval);
    };
  }, [tokenExpiry, isTranscriberReady, isTranscribing]);

  // Update hasSubscription when userSubscription changes
  useEffect(() => {
    if (userSubscription) {
      setHasSubscription(userSubscription.hoursleft > 0);
    }
  }, [userSubscription]);

  // Helper function to check if token is valid
  const isTokenValid = () => {
    if (!assemblyAIToken || !tokenExpiry) return false;
    
    const now = new Date();
    // Token is valid if it's not expired
    return now < tokenExpiry;
  };

  // Fetch AssemblyAI token
  const fetchAssemblyAIToken = async () => {
    try {
      console.log(' [Dictation] Fetching AssemblyAI token...');
      const startTime = performance.now();
      
      const response = await fetch('https://llck5m4mzd6sa6do3joadjzzs40jtoef.lambda-url.us-east-2.on.aws', {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const { token } = await response.json();
      const now = new Date();
      // Set expiry to 2.9 hours (just under 3 hours to be safe)
      const expiry = new Date(now.getTime() + 2.9 * 60 * 60 * 1000);
      
      setAssemblyAIToken(token);
      setTokenExpiry(expiry);
      
      // Schedule token refresh
      scheduleTokenRefresh(expiry);
      
      const endTime = performance.now();
      console.log(` [Dictation] Token fetched in ${(endTime - startTime).toFixed(2)}ms`);
      return token;
    } catch (error) {
      console.error(' [Dictation] Error fetching AssemblyAI token:', error);
      return null;
    }
  };

  const scheduleTokenRefresh = (expiry) => {
    if (tokenRefreshTimeoutRef.current) {
      clearTimeout(tokenRefreshTimeoutRef.current);
    }
    
    const now = new Date();
    const timeUntilRefresh = expiry.getTime() - now.getTime();
    
    if (timeUntilRefresh > 0) {
      tokenRefreshTimeoutRef.current = setTimeout(() => {
        fetchAssemblyAIToken();
      }, timeUntilRefresh);
    } else {
      // If token is already expired, fetch immediately
      fetchAssemblyAIToken();
    }
  };

  // Fetch user subscription data
  const fetchUserSubscription = async () => {
    try {
      console.log(' [Dictation] Fetching user subscription...');
      const startTime = performance.now();
      
      const user = await getCurrentUser();
      const owner = username || user.username;
      const subscriptionData = await client.graphql({
        query: queries.getUserSubscription,
        variables: { owner }
      });
      setUserSubscription(subscriptionData.data.getUserSubscription);
      
      const endTime = performance.now();
      console.log(` [Dictation] Subscription fetched in ${(endTime - startTime).toFixed(2)}ms`);
      return subscriptionData.data.getUserSubscription;
    } catch (error) {
      console.error(' [Dictation] Error fetching user subscription:', error);
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
            hoursleft: userSubscription.hoursleft - hoursUsed
          }
        }
      });
      setUserSubscription(updatedSubscription.data.updateUserSubscription);
    } catch (error) {
      console.error(" [Dictation] Error updating user subscription:", error);
    }
  };

  // Setup transcription connection in advance
  const setupTranscriptionConnection = async (token) => {
    if (rtRef.current) {
      // Close existing connection if there is one
      console.log(' [Dictation] Closing existing connection before setup');
      rtRef.current.close();
      rtRef.current = null;
    }
    
    console.log(' [Dictation] Setting up transcription connection...');
    const startTime = performance.now();
    
    return new Promise((resolve, reject) => {
      try {
        rtRef.current = new RealtimeTranscriber({
          token: token,
          sampleRate: 16000,
          endUtteranceSilenceThreshold: 1500,
        });
        
        // Setup event handlers
        rtRef.current.on('open', () => {
          if (!rtRef.current) {
            console.error(' [Dictation] rtRef.current is null in open event handler');
            return;
          }
          
          const endTime = performance.now();
          console.log(` [Dictation] Transcription connection established in ${(endTime - startTime).toFixed(2)}ms`);
          
          // Setup heartbeat to keep connection alive
          setupHeartbeat();
          
          setIsTranscriberReady(true);
          resolve();
          
          // Send a tiny empty buffer as a ping instead of text
          try {
            const emptyBuffer = new ArrayBuffer(2);
            rtRef.current.sendAudio(emptyBuffer);
          } catch (error) {
            console.error(' [Dictation] Error sending initial audio buffer:', error);
          }
        });
        
        rtRef.current.on('error', (err) => {
          console.error(' [Dictation] Transcription connection error:', err);
          setIsTranscriberReady(false);
          reject(err);
        });
        
        rtRef.current.on('close', () => {
          console.log(' [Dictation] Transcription connection closed');
          setIsTranscriberReady(false);
          
          // Clear heartbeat when connection is closed
          if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
            heartbeatIntervalRef.current = null;
          }
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
        console.error(' [Dictation] Error setting up transcription connection:', error);
        setIsTranscriberReady(false);
        reject(error);
      }
    });
  };

  // Refresh transcription connection with new token
  const refreshTranscriptionConnection = async (token) => {
    console.log(' [Dictation] Refreshing transcription connection with new token...');
    await setupTranscriptionConnection(token);
  };

  // Setup heartbeat to keep connection alive
  const setupHeartbeat = () => {
    // Clear any existing heartbeat
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    
    console.log(' [Dictation] Setting up new heartbeat interval');
    
    // Counter for heartbeats
    let heartbeatCount = 0;
    
    // Send a small ping every 30 seconds to keep the connection alive
    heartbeatIntervalRef.current = setInterval(() => {
      heartbeatCount++;
      
      if (rtRef.current) {
        console.log(` [Dictation] Sending heartbeat #${heartbeatCount} to keep connection alive`);
        
        // On the second heartbeat, log all dictation-related states
        if (heartbeatCount === 2) {
          console.log(' [Dictation] ===== STATE LOG AT SECOND HEARTBEAT =====');
          console.log(' [Dictation] isDictationLoading:', isDictationLoading);
          console.log(' [Dictation] isTranscribing:', isTranscribing);
          console.log(' [Dictation] isInitialized:', isInitialized);
          console.log(' [Dictation] isTranscriberReady:', isTranscriberReady);
          console.log(' [Dictation] dictationQueued:', dictationQueued);
          console.log(' [Dictation] isStoppingDictation:', isStoppingDictation);
          console.log(' [Dictation] hasSubscription:', hasSubscription);
          console.log(' [Dictation] tokenExpiry:', tokenExpiry);
          console.log(' [Dictation] rtRef.current exists:', !!rtRef.current);
          console.log(' [Dictation] heartbeatIntervalRef.current exists:', !!heartbeatIntervalRef.current);
          console.log(' [Dictation] recorder.current exists:', !!recorder.current);
          console.log(' [Dictation] recorder.current state:', recorder.current ? recorder.current.state : 'N/A');
          console.log(' [Dictation] streamRef.current exists:', !!streamRef.current);
          console.log(' [Dictation] timer:', timer);
          console.log(' [Dictation] ===== END STATE LOG =====');
        }
        
        // Send a tiny empty buffer as a ping
        const emptyBuffer = new ArrayBuffer(2);
        rtRef.current.sendAudio(emptyBuffer);
      } else {
        console.log(` [Dictation] Skipping heartbeat #${heartbeatCount} - rtRef.current is null`);
      }
    }, 30000); // Every 30 seconds
    
    // Send an immediate heartbeat to confirm setup
    if (rtRef.current) {
      console.log(' [Dictation] Sending immediate heartbeat to confirm setup');
      console.log(' [Dictation] ===== INITIAL STATE LOG =====');
      console.log(' [Dictation] isDictationLoading:', isDictationLoading);
      console.log(' [Dictation] isTranscribing:', isTranscribing);
      console.log(' [Dictation] isInitialized:', isInitialized);
      console.log(' [Dictation] isTranscriberReady:', isTranscriberReady);
      console.log(' [Dictation] dictationQueued:', dictationQueued);
      console.log(' [Dictation] isStoppingDictation:', isStoppingDictation);
      console.log(' [Dictation] rtRef.current exists:', !!rtRef.current);
      console.log(' [Dictation] ===== END INITIAL STATE LOG =====');
      const emptyBuffer = new ArrayBuffer(2);
      rtRef.current.sendAudio(emptyBuffer);
    }
  };

  // Timer functions
  const startTimer = () => {
    setTimer(0);
    timerIntervalRef.current = setInterval(() => {
      setTimer(prevTimer => prevTimer + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
  };

  // Start dictation
  const startDictation = async () => {
    // If already loading or stopping, just queue the action
    if (isDictationLoading || isStoppingDictation) {
      console.log(` [Dictation] Dictation already ${isStoppingDictation ? 'stopping' : 'loading'}, queuing action for when ready`);
      setDictationQueued(true);
      return;
    }

    try {
      console.log(' [Dictation] Starting dictation process...');
      const startTime = performance.now();
      
      // Always set loading state at the start of dictation
      setIsDictationLoading(true);
      setClipboardContent(""); // Clear content before loading
      textsRef.current = {}; // Reset transcript collection
      
      // Check subscription
      if (!hasSubscription) {
        console.log(' [Dictation] No subscription detected, checking again...');
        const subscriptionCheckStart = performance.now();
        
        // Try to refresh subscription info before giving up
        const subscription = await fetchUserSubscription();
        if (!subscription || subscription.hoursleft <= 0) {
          console.error(' [Dictation] User has no remaining hours');
          alert('You have no remaining dictation hours. Please upgrade your subscription.');
          setIsDictationLoading(false);
          return;
        }
        
        const subscriptionCheckEnd = performance.now();
        console.log(` [Dictation] Subscription check complete in ${(subscriptionCheckEnd - subscriptionCheckStart).toFixed(2)}ms`);
      }

      // Check if token is valid and transcriber is ready
      if (!isTokenValid() || !isTranscriberReady) {
        console.log(' [Dictation] Token invalid or transcriber not ready, setting up connection...');
        const setupStart = performance.now();
        
        // Get a fresh token if needed
        let token = assemblyAIToken;
        if (!isTokenValid()) {
          token = await fetchAssemblyAIToken();
        }
        
        // Setup transcription connection if not ready
        if (!isTranscriberReady) {
          await setupTranscriptionConnection(token);
        }
        
        const setupEnd = performance.now();
        console.log(` [Dictation] Connection setup complete in ${(setupEnd - setupStart).toFixed(2)}ms`);
      } else {
        console.log(' [Dictation] Using existing transcription connection');
        
        // Ensure heartbeat is running even if we're using an existing connection
        if (!heartbeatIntervalRef.current) {
          console.log(' [Dictation] Restarting heartbeat for existing connection');
          setupHeartbeat();
        }
      }

      // Request mic access
      console.log(' [Dictation] Requesting microphone access...');
      const micStart = performance.now();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 2,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        }
      });
      streamRef.current = stream;
      const micEnd = performance.now();
      console.log(` [Dictation] Microphone access granted in ${(micEnd - micStart).toFixed(2)}ms`);

      // Configure recorder
      console.log(' [Dictation] Configuring recorder...');
      const recorderStart = performance.now();
      
      const rawUaString = navigator.userAgent;
      let uaString = rawUaString.toLowerCase();
      let mimeType = /iphone|ipad/i.test(uaString) ? 'audio/wav;codecs=pcm' : 'audio/webm;codecs=pcm';
      let recorderType = /iphone|ipad/i.test(uaString) ? RecordRTC.StereoAudioRecorder : RecordRTC.StereoAudioRecorder;
      
      recorder.current = new RecordRTC(stream, {
        type: 'audio',
        mimeType: mimeType,
        recorderType: recorderType,
        timeSlice: 250,
        desiredSampRate: 16000,
        numberOfAudioChannels: 1,
        bufferSize: 4096,
        audioBitsPerSecond: 128000,
        ondataavailable: async (blob) => {
          if(!rtRef.current) return;
          const buffer = await blob.arrayBuffer();
          rtRef.current.sendAudio(buffer);
        },
      });
      
      const recorderEnd = performance.now();
      console.log(` [Dictation] Recorder configured in ${(recorderEnd - recorderStart).toFixed(2)}ms`);

      // Start recording
      console.log(' [Dictation] Starting recording...');
      recorder.current.startRecording();
      setIsTranscribing(true);
      
      if (noSleepRef.current) {
        noSleepRef.current.enable();
      }
      
      // Add a space to the clipboard to remove placeholder
      setClipboardContent(" ");
      
      startTimer();
      setIsDictationLoading(false);
      setDictationQueued(false); // Reset queued state
      
      const endTime = performance.now();
      console.log(` [Dictation] Dictation started successfully in ${(endTime - startTime).toFixed(2)}ms total`);
    } catch (error) {
      console.error(' [Dictation] Error starting dictation:', error);
      setIsDictationLoading(false);
      setDictationQueued(false); // Reset queued state
      alert('Failed to start dictation. Please try again.');
    }
  };

  // Check for queued dictation when loading or stopping state changes
  useEffect(() => {
    if (!isDictationLoading && !isStoppingDictation && dictationQueued && !isTranscribing) {
      console.log(' [Dictation] Executing queued dictation request');
      setTimeout(() => {
        startDictation();
      }, 500); // Small delay to ensure all states have settled
    }
  }, [isDictationLoading, isStoppingDictation, dictationQueued, isTranscribing]);

  // Stop dictation
  const stopDictation = () => {
    if (recorder.current && recorder.current.state !== 'stopped') {
      console.log(' [Dictation] Stopping dictation and closing connection...');
      setIsStoppingDictation(true);
      
      // Pause heartbeats while we're stopping
      if (heartbeatIntervalRef.current) {
        console.log(' [Dictation] Pausing heartbeats during stop process');
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      
      // Capture the current transcription to ensure we don't lose it
      const finalTranscription = transcription;
      
      // Immediately set these states to false to prevent race conditions
      setIsTranscribing(false);
      setIsTranscriberReady(false);
      
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

        // Properly close the WebSocket connection
        if (rtRef.current) {
          console.log(' [Dictation] Closing WebSocket connection');
          rtRef.current.close();
          rtRef.current = null;
        }
        
        // Send final transcription to parent component
        if (finalTranscription) {
          console.log(' [Dictation] Sending final transcription to parent component');
          onTextStreamUpdate(finalTranscription);
        }
        
        // After a brief delay, re-initialize the connection if needed
        setTimeout(async () => {
          console.log(' [Dictation] Re-initializing connection after stop');
          console.log(` [Dictation] Current states - isDictationLoading: ${isDictationLoading}, isTranscribing: ${isTranscribing}, isStoppingDictation: ${isStoppingDictation}`);
          
          // Force isDictationLoading to false to ensure we can re-initialize
          if (isDictationLoading) {
            console.log(' [Dictation] Forcing isDictationLoading to false to allow re-initialization');
            setIsDictationLoading(false);
          }
          
          // If there's a queued dictation request, handle it directly
          if (dictationQueued) {
            console.log(' [Dictation] Processing queued dictation request after stopping');
            setIsStoppingDictation(false);
            setTimeout(() => {
              startDictation();
            }, 500);
            return;
          }
          
          // Otherwise, proceed with normal re-initialization
          try {
            // Set loading state to true to match initial loading behavior
            setIsDictationLoading(true);
            
            // Get a fresh token if needed
            let token = assemblyAIToken;
            if (!isTokenValid()) {
              console.log(' [Dictation] Fetching fresh token for re-initialization');
              token = await fetchAssemblyAIToken();
            }
            
            // Setup new transcription connection with explicit promise handling
            if (token) {
              console.log(' [Dictation] Setting up new transcription connection');
              try {
                // Use a similar approach to the initial connection setup
                // by setting up a new promise-based function that follows the same sequence
                const reinitializeConnection = () => {
                  return new Promise((resolveReinit, rejectReinit) => {
                    try {
                      if (rtRef.current) {
                        // Setup heartbeat before setting ready state, just like in the initial setup
                        console.log(' [Dictation] Setting up heartbeat before marking connection ready');
                        setupHeartbeat();
                        
                        // Now set the ready state
                        setIsTranscriberReady(true);
                        resolveReinit();
                      } else {
                        rejectReinit(new Error('rtRef.current is null after connection setup'));
                      }
                    } catch (error) {
                      rejectReinit(error);
                    }
                  });
                };
                
                // First set up the connection
                await setupTranscriptionConnection(token);
                console.log(' [Dictation] New connection successfully established');
                
                // Then initialize it in the same sequence as the initial setup
                await reinitializeConnection();
                console.log(' [Dictation] Connection fully initialized with heartbeat');
              } catch (setupError) {
                console.error(' [Dictation] Failed to setup new connection:', setupError);
              }
            } else {
              console.error(' [Dictation] No valid token available for re-initialization');
            }
          } catch (error) {
            console.error(' [Dictation] Error during re-initialization:', error);
          } finally {
            setIsDictationLoading(false);
            setIsStoppingDictation(false);
          }
        }, 1000); // Increased delay to ensure everything is cleaned up
      });
    }
  };

  // Toggle dictation state
  const toggleDictation = () => {
    if (isTranscribing || isStoppingDictation) {
      stopDictation();
    } else {
      startDictation();
    }
  };

  return {
    isDictationLoading,
    isTranscribing,
    isInitialized,
    isTranscriberReady,
    dictationQueued,
    isStoppingDictation,
    startDictation,
    stopDictation,
    toggleDictation
  };
};

export default Dictation;