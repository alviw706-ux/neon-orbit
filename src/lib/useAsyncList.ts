import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from '@/lib/edgeFunctions';

export function useAsyncList<T>(load: () => Promise<T[]>) {
  const loader = useRef(load);
  loader.current = load;
  const [items, setItems] = useState<T[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    loader.current()
      .then((result) => {
        if (!active) return;
        setItems(result);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(errorMessage(err));
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  return { items, error, loading, reload };
}
