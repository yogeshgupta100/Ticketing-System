import { useState, useEffect, useCallback, useRef } from "react";
import { apiService } from "../../services/api";
import { stompWsService } from "../../services/stompWebSocket";
import type {
  Ticket,
  CreateMessageRequest,
  UpdateTicketRequest,
  WebSocketMessage,
} from "../../types";

export const useTicket = (ticketId: string) => {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [updating, setUpdating] = useState(false);

  const subscriptionRef = useRef<any>(null);
  const isConnectedRef = useRef(false);

  const fetchTicket = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedTicket = await apiService.getTicket(ticketId);
      setTicket(fetchedTicket);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch ticket");
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  useEffect(() => {
    const handleWebSocketMessage = (message: WebSocketMessage) => {
      if (
        message.type === "TICKET_UPDATED" &&
        message.payload.id === ticketId
      ) {
        setTicket(message.payload);
      } else if (
        message.type === "MESSAGE_CREATED" &&
        message.payload.ticketId === ticketId
      ) {
        setTicket((prev) =>
          prev
            ? { ...prev, messages: [...prev.messages, message.payload.message] }
            : prev
        );
      }
    };

    if (stompWsService.isConnected()) {
      const ticketSubscription = stompWsService.subscribeToTicketUpdates(
        ticketId,
        handleWebSocketMessage
      );

      subscriptionRef.current = ticketSubscription;
      isConnectedRef.current = true;
    }

    const unsubscribeStatus = stompWsService.onConnectionStatusChange(
      (status) => {
        if (status.isConnected && !isConnectedRef.current) {
          const ticketSubscription = stompWsService.subscribeToTicketUpdates(
            ticketId,
            handleWebSocketMessage
          );

          subscriptionRef.current = ticketSubscription;
          isConnectedRef.current = true;
        } else if (!status.isConnected && isConnectedRef.current) {
          if (subscriptionRef.current) {
            stompWsService.unsubscribe(subscriptionRef.current);
            subscriptionRef.current = null;
          }
          isConnectedRef.current = false;
        }
      }
    );

    return () => {
      if (subscriptionRef.current) {
        stompWsService.unsubscribe(subscriptionRef.current);
        subscriptionRef.current = null;
      }
      unsubscribeStatus();
      isConnectedRef.current = false;
    };
  }, [ticketId]);

  const sendMessage = useCallback(
    async (data: CreateMessageRequest) => {
      try {
        setSendingMessage(true);
        const newMessage = await apiService.createMessage(ticketId, data);
        setTicket((prev) =>
          prev ? { ...prev, messages: [...prev.messages, newMessage] } : prev
        );
      } catch (err) {
        throw err;
      } finally {
        setSendingMessage(false);
      }
    },
    [ticketId]
  );

  const updateTicket = useCallback(
    async (data: UpdateTicketRequest) => {
      try {
        setUpdating(true);
        const updatedTicket = await apiService.updateTicket(ticketId, data);
        setTicket(updatedTicket);
      } catch (err) {
        throw err;
      } finally {
        setUpdating(false);
      }
    },
    [ticketId]
  );

  return {
    ticket,
    loading,
    error,
    sendingMessage,
    updating,
    sendMessage,
    updateTicket,
    refreshTicket: fetchTicket,
  };
};
