import { useCallback, useEffect, useState } from 'react';
import { CONNECTION_STATE_CHANGE } from 'aws-amplify/api';
import { Hub } from 'aws-amplify/utils';
import { fetchUserAttributes } from 'aws-amplify/auth';
import * as subscriptions from '../../graphql/subscriptions';
import * as queries from '../../graphql/queries';
import * as mutations from '../../graphql/mutations';
import { getAmplifyClient } from '../../services/amplifyClient';
import { addNativeAppStateListener } from '../../services/nativePlatform';
import { trackMilestone } from '../../utils/analytics';
import { groupItemsByWeek } from '../../utils/historyGrouping';

function useNotesHistory(username, setIsWebSocketConnecting) {
  const [notes, setNotes] = useState([]);
  const [, setTranscripts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [newItems, setNewItems] = useState(new Set());
  const [collapsedWeeks, setCollapsedWeeks] = useState(new Set());

  const checkNoteMilestones = useCallback(async () => {
    try {
      const client = getAmplifyClient();
      const userAttributes = await fetchUserAttributes();
      const userId = userAttributes.sub;

      const subscriptionData = await client.graphql({
        query: queries.getUserSubscription,
        variables: { owner: userId }
      });
      const subscription = subscriptionData.data.getUserSubscription;

      const notesData = await client.graphql({
        query: queries.listNotes,
        variables: { owner: userId }
      });
      const allNotes = notesData.data.listNotes.items;
      const noteCount = allNotes.filter(note => note.note && note.note.trim() !== '').length;

      console.log(`[Tracking] User has ${noteCount} total notes`);

      if (noteCount === 3 && subscription?.has3Notes !== true) {
        await trackMilestone('user_activated_3notes', userId, {
          milestone: '3_notes',
          activation_type: 'early_adopter'
        });

        await client.graphql({
          query: mutations.updateUserSubscription,
          variables: {
            input: {
              owner: userId,
              has3Notes: true
            }
          }
        });

        console.log('[GA4] Early adopter! 3 notes milestone reached');
      }

      if (noteCount === 5 && subscription?.has5Notes !== true) {
        await trackMilestone('user_activated_5notes', userId, {
          milestone: '5_notes',
          activation_type: 'power_user'
        });

        await client.graphql({
          query: mutations.updateUserSubscription,
          variables: {
            input: {
              owner: userId,
              has5Notes: true
            }
          }
        });

        console.log('[GA4] Power user! 5 notes milestone reached');
      }
    } catch (error) {
      console.error('[Tracking] Milestone check error:', error);
    }
  }, []);

  const fetchNotes = useCallback(async () => {
    const client = getAmplifyClient();

    setIsLoading(true);
    setFetchError(null);
    try {
      const notesData = await client.graphql({
        query: queries.listNotes,
        variables: {
          owner: username,
          sortDirection: 'DESC',
          limit: 120
        }
      });
      const fetchedNotes = notesData.data.listNotes.items;

      const filteredNotes = fetchedNotes.filter(item => item.note && item.note.trim() !== '');
      const filteredTranscripts = fetchedNotes.filter(item => item.transcript && item.transcript.trim() !== '');

      setNotes(filteredNotes.slice(0, 100));
      setTranscripts(filteredTranscripts.slice(0, 100));

      if (filteredNotes.length > 0 || filteredTranscripts.length > 0) {
        const groupedWeeks = groupItemsByWeek([...filteredNotes, ...filteredTranscripts]);

        if (groupedWeeks.length > 0) {
          setCollapsedWeeks(new Set(groupedWeeks.slice(1).map(week => week.weekStart)));
        }
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
      setFetchError('Unable to refresh recent notes. Check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }, [username]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  useEffect(() => {
    let listenerHandle = null;
    let disposed = false;

    addNativeAppStateListener(({ isActive }) => {
      if (isActive) {
        fetchNotes();
      }
    }).then((handle) => {
      if (disposed) {
        handle?.remove();
      } else {
        listenerHandle = handle;
      }
    }).catch((error) => {
      console.warn('Unable to register native app-state listener:', error);
    });

    return () => {
      disposed = true;
      listenerHandle?.remove();
    };
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
        console.log('Received data from subscription:', data);
        const updatedData = data.onUpdateNotesByOwner;

        if (updatedData.note && updatedData.note.trim() !== '') {
          setNotes(prevNotes => {
            const updatedNotes = [updatedData, ...prevNotes.filter(note => note.timestamp !== updatedData.timestamp)];
            return updatedNotes.slice(0, 100);
          });
          setNewItems(prevNewItems => new Set([...prevNewItems, updatedData.timestamp]));
          checkNoteMilestones();
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
  }, [username, checkNoteMilestones, setIsWebSocketConnecting]);

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
    fetchError,
    refreshNotes: fetchNotes,
    newItems,
    collapsedWeeks,
    removeHighlight,
    toggleWeekCollapse
  };
}

export default useNotesHistory;
