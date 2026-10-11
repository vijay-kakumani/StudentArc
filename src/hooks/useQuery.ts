import { useState, useEffect } from 'react';

// Global cache to persist data across component mounts/unmounts
const globalCache: Record<string, { data: any, timestamp: number }> = {};
const activePromises: Record<string, Promise<any>> = {};

export function invalidateAllQueries() {
  for (const key in globalCache) {
    delete globalCache[key];
  }
}

export function useQuery<T>(
  queryKey: string | null, 
  fetcher: () => Promise<T>,
  staleTime: number = 60000 // default 60s
) {
  const [currentKey, setCurrentKey] = useState(queryKey);
  const [data, setData] = useState<T | null>(() => 
    queryKey && globalCache[queryKey] ? globalCache[queryKey].data : null
  );
  const [loading, setLoading] = useState<boolean>(!data);
  const [error, setError] = useState<Error | null>(null);

  if (queryKey !== currentKey) {
    setCurrentKey(queryKey);
    const cached = queryKey && globalCache[queryKey] ? globalCache[queryKey].data : null;
    setData(cached);
    setLoading(!cached);
    setError(null);
  }

  useEffect(() => {
    if (!queryKey) {
      setLoading(false);
      return;
    }
    
    let isMounted = true;
    
    const cached = globalCache[queryKey];
    if (cached) {
      setData(cached.data);
      // If data is fresh, don't refetch
      if (Date.now() - cached.timestamp < staleTime) {
        setLoading(false);
        setError(null);
        return;
      }
    } else {
      setLoading(true);
    }

    if (!activePromises[queryKey]) {
      activePromises[queryKey] = fetcher().finally(() => {
        delete activePromises[queryKey];
      });
    }

    activePromises[queryKey]
      .then((res: T) => {
        if (isMounted) {
          globalCache[queryKey] = { data: res, timestamp: Date.now() };
          setData(res);
          setLoading(false);
          setError(null);
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          setError(err);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [queryKey]); // Re-run if queryKey changes

  return { data, loading, error, isCached: queryKey ? !!globalCache[queryKey] : false };
}
