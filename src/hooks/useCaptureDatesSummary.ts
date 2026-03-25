import { useEffect, useState } from 'react';
import {
  getExplorerDatesSummary,
  type DateMediaCounts,
} from '../services/apiClient';

export function useCaptureDatesSummary() {
  const [dataByDate, setDataByDate] = useState<Record<string, DateMediaCounts>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getExplorerDatesSummary()
      .then((res) => {
        if (!cancelled) {
          setDataByDate(res.dates ?? {});
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load dates');
          setDataByDate({});
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { dataByDate, loading, error };
}
