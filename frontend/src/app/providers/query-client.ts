import { QueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

const NON_RETRYABLE_STATUSES = new Set([400, 401, 403, 404, 422]);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: (failureCount, error) => {
        if (isAxiosError(error)) {
          const status = error.response?.status;
          if (status && NON_RETRYABLE_STATUSES.has(status)) {
            return false;
          }
        }
        return failureCount < 2;
      },
    },
  },
});
