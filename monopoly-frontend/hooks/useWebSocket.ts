/**
 * WebSocket Hook
 * 
 * Custom React hook for managing WebSocket connections.
 * Handles connection, subscription, message receiving, and reconnection.
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { WS_BASE_URL, WS_EVENTS } from '@/lib/constants';
import type { WebSocketMessage } from '@/lib/types';

/**
 * WebSocket hook return type.
 */
interface UseWebSocketReturn {
  isConnected: boolean;
  subscribe: (gameId: string) => void;
  unsubscribe: (gameId: string) => void;
  sendMessage: (message: any) => void;
  lastMessage: WebSocketMessage | null;
}

/**
 * Custom hook for WebSocket connection to the game server.
 * 
 * Automatically reconnects on disconnect and handles all message routing.
 * 
 * @param onMessage - Callback for received messages
 * @param autoConnect - Whether to connect automatically (default: true)
 * @returns WebSocket connection interface
 */
export function useWebSocket(
  onMessage?: (message: WebSocketMessage) => void,
  autoConnect: boolean = true
): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 2000; // 2 seconds

  /**
   * Send a message through the WebSocket.
   */
  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }, []);

  /**
   * Subscribe to a game's updates.
   */
  const subscribe = useCallback((gameId: string) => {
    sendMessage({
      action: 'subscribe',
      gameId,
    });
  }, [sendMessage]);

  /**
   * Unsubscribe from a game's updates.
   */
  const unsubscribe = useCallback((gameId: string) => {
    sendMessage({
      action: 'unsubscribe',
      gameId,
    });
  }, [sendMessage]);

  /**
   * Connect to WebSocket server.
   */
  const connect = useCallback(() => {
    try {
      console.log('Connecting to WebSocket...', WS_BASE_URL);
      const ws = new WebSocket(WS_BASE_URL);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        reconnectAttempts.current = 0;

        // Send ping every 30 seconds to keep connection alive
        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ action: 'ping' }));
          }
        }, 30000);

        // Store interval ID for cleanup
        (ws as any)._pingInterval = pingInterval;
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('WebSocket message received:', message.event);
          
          setLastMessage(message);
          
          // Call external message handler
          if (onMessage) {
            onMessage(message);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected', event.code, event.reason);
        setIsConnected(false);

        // Clear ping interval
        if ((ws as any)._pingInterval) {
          clearInterval((ws as any)._pingInterval);
        }

        // Attempt to reconnect if not closed intentionally
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          console.log(`Reconnecting... (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectDelay);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          console.error('Max reconnection attempts reached');
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }, [onMessage]);

  /**
   * Disconnect from WebSocket server.
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (wsRef.current) {
      // Clear ping interval
      if ((wsRef.current as any)._pingInterval) {
        clearInterval((wsRef.current as any)._pingInterval);
      }

      wsRef.current.close(1000, 'Disconnecting intentionally');
      wsRef.current = null;
    }

    setIsConnected(false);
  }, []);

  // Auto-connect and cleanup on mount/unmount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect]); // Only run once

  return {
    isConnected,
    subscribe,
    unsubscribe,
    sendMessage,
    lastMessage,
  };
}

