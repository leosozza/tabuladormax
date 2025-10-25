/**
 * React Query performance monitoring wrapper
 * Tracks query execution time, cache hits, and data size
 */

import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { performanceMonitor } from './performanceMonitor';

/**
 * Enhanced useQuery hook with performance monitoring
 */
export function useMonitoredQuery<TData = unknown, TError = Error>(
  options: UseQueryOptions<TData, TError> & { queryKey: unknown[] }
): UseQueryResult<TData, TError> {
  const startTimeRef = useRef<number>(0);
  const queryKeyString = JSON.stringify(options.queryKey);

  // Start timing before query
  if (startTimeRef.current === 0) {
    startTimeRef.current = performance.now();
  }

  const result = useQuery(options);

  // Monitor query performance
  useEffect(() => {
    if (result.status !== 'pending' && startTimeRef.current > 0) {
      const duration = performance.now() - startTimeRef.current;
      
      // Calculate data size (rough estimate)
      let dataSize = 0;
      if (result.data) {
        try {
          dataSize = JSON.stringify(result.data).length;
        } catch {
          dataSize = 0;
        }
      }

      performanceMonitor.recordQueryPerformance({
        queryKey: queryKeyString,
        value: duration,
        status: result.status === 'error' ? 'error' : 'success',
        dataSize,
        cached: result.isFetched && !result.isFetching,
        metadata: {
          isStale: result.isStale,
          dataUpdatedAt: result.dataUpdatedAt,
        },
      });

      // Reset timer
      startTimeRef.current = 0;
    }
  }, [result.status, result.isFetched, result.isFetching, queryKeyString, result.data, result.isStale, result.dataUpdatedAt]);

  return result;
}

/**
 * Hook to track custom query metrics manually
 */
export function useQueryMetrics() {
  return {
    trackQuery: (queryKey: string, duration: number, dataSize?: number) => {
      performanceMonitor.recordQueryPerformance({
        queryKey,
        value: duration,
        status: 'success',
        dataSize,
      });
    },
    trackQueryError: (queryKey: string, duration: number, error: Error) => {
      performanceMonitor.recordQueryPerformance({
        queryKey,
        value: duration,
        status: 'error',
        metadata: {
          errorMessage: error.message,
          errorName: error.name,
        },
      });
    },
  };
}
