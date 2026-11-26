import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes default freshness
      gcTime: 1000 * 60 * 15, // 15 minutes in-memory retention
      refetchOnWindowFocus: false, // prevent intrusive network requests on window switch
      refetchOnMount: false, // use existing cached data immediately when available
      retry: 1 // retry once on transient network failure
    },
    mutations: {
      retry: 0
    }
  }
});
