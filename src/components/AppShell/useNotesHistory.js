import { cleanupPatientPdfCache } from '../../services/patientPdfDelivery';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CONNECTION_STATE_CHANGE } from 'aws-amplify/api';
import { Hub } from 'aws-amplify/utils';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import * as subscriptions from '../../graphql/subscriptions';
import * as queries from '../../graphql/queries';
import { getAmplifyClient } from '../../services/amplifyClient';
import { groupItemsByWeek } from '../../utils/historyGrouping';

function useNotesHistory(username, setIsWebSocketConnecting) {
  const [notes, setNotes] = useState([]);
  const [refreshError, setRefreshError] = useState('');
  const requestRef = useRef(0);
  useEffect(() => () => { requestRef.current += 1; }, []);
  const [, setTranscripts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newItems, setNewItems] = useState(new Set());
  const [collapsedWeeks, setCollapsedWeeks] = useState(new Set());

  const fetchNotes = useCallback(async () => {
    const client = getAmplifyClient();
    const request = ++requestRef.current;
    setIsLoading(true);
    setRefreshError('');
    try {
      const fetchedNotes = [];
      let nextToken;
      const seenTokens = new Set();
      do {
        const notesData = await client.graphql({
          query: queries.listNotes,
          variables: { owner: username, sortDirection: 'DESC', limit: 120, ...(nextToken ? { nextToken } : {}) }
        });
        fetchedNotes.push(...notesData.data.listNotes.items.filter(item => item && item.generationStatus !== 'DELETED'));
        nextToken = notesData.data.listNotes.nextToken;
        if (nextToken && seenTokens.has(nextToken)) throw new Error('History pagination repeated. Please refresh.');
        if (nextToken) seenTokens.add(nextToken);
      } while (nextToken && fetchedNotes.filter(item => item.note?.trim()).length < 100);

      const filteredNotes = fetchedNotes.filter(item => item.note && item.note.trim() !== '');
      const filteredTranscripts = fetchedNotes.filter(item => item.transcript && item.transcript.trim() !== '');

      if (request !== requestRef.current) return;
      setNotes(filteredNotes.slice(0, 100));
      setTranscripts(filteredTranscripts.slice(0, 100));

      if (filteredNotes.length > 0 || filteredTranscripts.length > 0) {
        const groupedWeeks = groupItemsByWeek([...filteredNotes, ...filteredTranscripts]);

        if (groupedWeeks.length > 0) {
          setCollapsedWeeks(new Set(groupedWeeks.slice(1).map(week => week.weekStart)));
        }
      }
    } catch (error) {
      if (request === requestRef.current) setRefreshError('Could not refresh recent history. Please try again.');
    } finally {
      if (request === requestRef.current) setIsLoading(false);
    }
  }, [username]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  useEffect(() => {
    const client = getAmplifyClient();
    const hubListener = Hub.listen('api', (data) => {
      const { payload } = data;
      if (payload.event === CONNECTION_STATE_CHANGE) {
        const connectionState = payload.data.connectionState;
        console.log('[App] Connection state:', connectionState);
        setIsWebSocketConnecting(connectionState === 'connecting');
      }
    });

    const subscription = client.graphql({
      query: subscriptions.onUpdateNotesByOwner,
      variables: { owner: username }
    }).subscribe({
      next: ({ data }) => {
        // Clinical subscription payloads must never be logged.
        const updatedData = data.onUpdateNotesByOwner;

        if (updatedData.note && updatedData.note.trim() !== '') {
          setNotes(prevNotes => {
            const updatedNotes = [updatedData, ...prevNotes.filter(note => note.timestamp !== updatedData.timestamp)];
            return updatedNotes.slice(0, 100);
          });
          setNewItems(prevNewItems => new Set([...prevNewItems, updatedData.timestamp]));
        }

        if (updatedData.transcript && updatedData.transcript.trim() !== '') {
          setTranscripts(prevTranscripts => {
            const updatedTranscripts = [updatedData, ...prevTranscripts.filter(transcript => transcript.timestamp !== updatedData.timestamp)];
            return updatedTranscripts.slice(0, 100);
          });
          setNewItems(prevNewItems => new Set([...prevNewItems, updatedData.timestamp]));
        }
      },
      error: (error) => console.warn(error)
    });

    return () => {
      subscription.unsubscribe();
      hubListener();
    };
  }, [username, setIsWebSocketConnecting]);

  useEffect(() => {
    let disposed = false;
    let listener;
    const resume = () => { if (!disposed) { fetchNotes(); cleanupPatientPdfCache(); } };
    const visible = () => { if (document.visibilityState === 'visible') resume(); };
    document.addEventListener('visibilitychange', visible);
    if (Capacitor.isNativePlatform()) {
      App.addListener('appStateChange', ({ isActive }) => { if (isActive) resume(); })
        .then(handle => { if (disposed) handle.remove(); else listener = handle; })
        .catch(() => {});
    }
    return () => { disposed = true; document.removeEventListener('visibilitychange', visible); listener?.remove(); };
  }, [fetchNotes]);

  const removeHighlight = (timestamp) => {
    setNewItems(prevNewItems => {
      const updatedNewItems = new Set(prevNewItems);
      updatedNewItems.delete(timestamp);
      return updatedNewItems;
    });
  };

  const toggleWeekCollapse = (weekStart) => {
    setCollapsedWeeks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(weekStart)) {
        newSet.delete(weekStart);
      } else {
        newSet.add(weekStart);
      }
      return newSet;
    });
  };

  return {
    notes,
    setNotes,
    setTranscripts,
    isLoading,
    refreshError,
    newItems,
    collapsedWeeks,
    refreshNotes: fetchNotes,
    removeHighlight,
    toggleWeekCollapse
  };
}

export default useNotesHistory;
