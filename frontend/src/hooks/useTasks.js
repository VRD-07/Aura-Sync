import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { getResults, runWhatIf, uploadProject } from '../api/client';

export function useTasks() {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const data = await getResults();
      setTasks(Array.isArray(data?.tasks) ? data.tasks : []);
    } catch (e) {
      setError(e?.message ?? 'Failed to load results');
    }
  }, []);

  const upload = useCallback(
    async (file) => {
      setError(null);
      const data = await uploadProject(file);
      setTasks(Array.isArray(data?.tasks) ? data.tasks : []);
      return data;
    },
    []
  );

  const whatIf = useCallback(async (durationMultiplier) => {
    setError(null);
    const data = await runWhatIf(durationMultiplier);
    setTasks(Array.isArray(data?.tasks) ? data.tasks : []);
    return data;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refresh();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  useEffect(() => {
    const socket = io({
      path: '/socket.io',
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      // connected
    });

    socket.on('tasks_update', (payload) => {
      const next = payload?.tasks;
      if (Array.isArray(next)) setTasks(next);
    });

    socket.on('disconnect', () => {
      // disconnected
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  return { tasks, setTasks, isLoading, error, refresh, upload, whatIf };
}

