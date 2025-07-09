import { useEffect, useRef, useCallback } from 'react';

interface RealtimeEvent {
  type: 'company_claimed' | 'company_unclaimed' | 'connected' | 'heartbeat';
  company_id?: number;
  claimed_by_username?: string;
  unclaimed_by_username?: string;
  company_name?: string;
  timestamp?: string;
  connection_id?: string;
  user_id?: number;
  username?: string;
}

interface UseRealtimeUpdatesOptions {
  onCompanyClaimed?: (event: RealtimeEvent) => void;
  onCompanyUnclaimed?: (event: RealtimeEvent) => void;
  onConnected?: (event: RealtimeEvent) => void;
  onError?: (error: Event) => void;
  enabled?: boolean;
}

export const useRealtimeUpdates = ({
  onCompanyClaimed,
  onCompanyUnclaimed,
  onConnected,
  onError,
  enabled = true
}: UseRealtimeUpdatesOptions = {}) => {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (!enabled || eventSourceRef.current || typeof window === 'undefined') return;

    try {
      const eventSource = new EventSource('/api/outreach/realtime');
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('SSE connection established');
        reconnectAttemptsRef.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const data: RealtimeEvent = JSON.parse(event.data);
          
          switch (data.type) {
            case 'company_claimed':
              onCompanyClaimed?.(data);
              break;
            case 'company_unclaimed':
              onCompanyUnclaimed?.(data);
              break;
            case 'connected':
              onConnected?.(data);
              break;
            case 'heartbeat':
              // Heartbeat received, connection is alive
              break;
            default:
              console.log('Unknown SSE event type:', data.type);
          }
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        onError?.(error);
        
        // Attempt to reconnect
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`Attempting to reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
            disconnect();
            connect();
          }, delay);
        } else {
          console.error('Max reconnection attempts reached');
        }
      };

    } catch (error) {
      console.error('Failed to create EventSource:', error);
    }
  }, [enabled, onCompanyClaimed, onCompanyUnclaimed, onConnected, onError]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    isConnected: typeof window !== 'undefined' && eventSourceRef.current?.readyState === EventSource.OPEN,
    connect,
    disconnect
  };
}; 