import { Client } from "@stomp/stompjs";
import type { Message } from "@stomp/stompjs";
import { config } from "../config";
import { tokenStorage } from "./tokenStorage";

export interface WebSocketMessage {
  type:
    | "TICKET_UPDATED"
    | "MESSAGE_CREATED"
    | "TICKET_CREATED"
    | "USER_UPDATED";
  payload: any;
  timestamp: number;
}

export interface ConnectionStatus {
  isConnected: boolean;
  isConnecting: boolean;
  error?: string;
  reconnectAttempts: number;
}

export interface WebSocketSubscription {
  id: string;
  topic: string;
  callback: (message: WebSocketMessage) => void;
}

class StompWebSocketService {
  private client: Client | null = null;
  private subscriptions = new Map<string, WebSocketSubscription>();
  private connectionStatus: ConnectionStatus = {
    isConnected: false,
    isConnecting: false,
    reconnectAttempts: 0,
  };
  private statusListeners: ((status: ConnectionStatus) => void)[] = [];
  private reconnectTimer: NodeJS.Timeout | null = null;
  private messageQueue: WebSocketMessage[] = [];

  constructor() {}

  private initializeClient() {
    const tokenData = tokenStorage.getToken();

    if (!tokenData) {
      throw new Error("No authentication token available");
    }

    this.client = new Client({
      brokerURL: config.wsUrl,
      reconnectDelay: config.websocket.reconnectInterval,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      debug: config.isDevelopment ? console.log : () => {},
      connectHeaders: {
        authorization: `Bearer ${tokenData.accessToken}`,
        "x-auth-token": tokenData.accessToken,
      },
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    if (!this.client) return;

    this.client.onConnect = () => {
      console.log("STOMP WebSocket connected");
      this.connectionStatus.isConnected = true;
      this.connectionStatus.isConnecting = false;
      this.connectionStatus.error = undefined;
      this.connectionStatus.reconnectAttempts = 0;

      this.notifyStatusChange();
      this.processMessageQueue();
      this.resubscribeAll();
    };

    this.client.onDisconnect = () => {
      console.log("STOMP WebSocket disconnected");
      this.connectionStatus.isConnected = false;
      this.connectionStatus.isConnecting = false;
      this.notifyStatusChange();
    };

    this.client.onStompError = (frame) => {
      console.error("STOMP error:", frame);
      this.connectionStatus.error =
        frame.headers.message || "STOMP error occurred";
      this.notifyStatusChange();
    };

    this.client.onWebSocketError = (event) => {
      console.error("WebSocket error:", event);
      this.connectionStatus.error = "WebSocket connection failed";
      this.connectionStatus.isConnecting = false;
      this.notifyStatusChange();

      console.log("WebSocket error occurred, not attempting reconnect");
    };

    this.client.onWebSocketClose = () => {
      console.log("WebSocket connection closed");
      this.connectionStatus.isConnected = false;
      this.connectionStatus.isConnecting = false;
      this.notifyStatusChange();

      if (this.connectionStatus.reconnectAttempts < 2) {
        this.scheduleReconnect();
      } else {
        console.log("Max reconnection attempts reached, stopping reconnection");
      }
    };
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (
      this.connectionStatus.reconnectAttempts <
      config.websocket.reconnectAttempts
    ) {
      this.connectionStatus.reconnectAttempts++;
      this.reconnectTimer = setTimeout(() => {
        this.connect();
      }, config.websocket.reconnectInterval);
    }
  }

  private processMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.broadcastMessage(message);
      }
    }
  }

  private resubscribeAll() {
    this.subscriptions.forEach((subscription) => {
      this.subscribeToTopic(subscription.topic, subscription.callback);
    });
  }

  async connect(): Promise<void> {
    if (
      this.connectionStatus.isConnecting ||
      this.connectionStatus.isConnected
    ) {
      return;
    }

    try {
      this.connectionStatus.isConnecting = true;
      this.connectionStatus.error = undefined;
      this.notifyStatusChange();

      if (!this.client) {
        this.initializeClient();
      }

      if (this.client) {
        await this.client.activate();
      }
    } catch (error) {
      console.error("Failed to connect:", error);
      this.connectionStatus.isConnecting = false;
      this.connectionStatus.error =
        error instanceof Error ? error.message : "Connection failed";
      this.notifyStatusChange();

      if (
        error instanceof Error &&
        (error.message.includes("Failed to fetch") ||
          error.message.includes("WebSocket connection failed") ||
          error.message.includes("WebSocket connection to") ||
          error.message.includes("NetworkError"))
      ) {
        console.log(
          "WebSocket server not available, skipping reconnect attempts"
        );
        return;
      }

      this.scheduleReconnect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.client && this.connectionStatus.isConnected) {
      await this.client.deactivate();
    }

    this.connectionStatus.isConnected = false;
    this.connectionStatus.isConnecting = false;
    this.notifyStatusChange();
  }

  subscribeToTopic(
    topic: string,
    callback: (message: WebSocketMessage) => void
  ): string {
    const subscriptionId = `sub_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    this.subscriptions.set(subscriptionId, {
      id: subscriptionId,
      topic,
      callback,
    });

    if (this.connectionStatus.isConnected && this.client) {
      this.client!.subscribe(topic, (message: Message) => {
        try {
          const parsedMessage = JSON.parse(message.body);
          const wsMessage: WebSocketMessage = {
            type: parsedMessage.type,
            payload: parsedMessage,
            timestamp: Date.now(),
          };

          callback(wsMessage);
          this.broadcastMessage(wsMessage);
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      });
    }

    return subscriptionId;
  }

  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      this.subscriptions.delete(subscriptionId);
    }
  }

  private broadcastMessage(message: WebSocketMessage) {
    this.subscriptions.forEach((subscription) => {
      try {
        subscription.callback(message);
      } catch (error) {
        console.error("Error in subscription callback:", error);
      }
    });
  }

  sendMessage(destination: string, message: any): void {
    if (this.connectionStatus.isConnected && this.client) {
      this.client.publish({
        destination,
        body: JSON.stringify(message),
      });
    } else {
      this.messageQueue.push({
        type: "TICKET_UPDATED",
        payload: message,
        timestamp: Date.now(),
      });
    }
  }

  onConnectionStatusChange(
    callback: (status: ConnectionStatus) => void
  ): () => void {
    this.statusListeners.push(callback);

    callback(this.connectionStatus);

    return () => {
      const index = this.statusListeners.indexOf(callback);
      if (index > -1) {
        this.statusListeners.splice(index, 1);
      }
    };
  }

  private notifyStatusChange() {
    this.statusListeners.forEach((callback) => {
      try {
        callback(this.connectionStatus);
      } catch (error) {
        console.error("Error in status listener:", error);
      }
    });
  }

  isConnected(): boolean {
    return this.connectionStatus.isConnected;
  }

  getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  async testConnection(): Promise<boolean> {
    try {
      const testUrl = config.wsUrl
        .replace("ws://", "http://")
        .replace("wss://", "https://");
      const response = await fetch(testUrl, {
        method: "GET",
        headers: {
          Upgrade: "websocket",
          Connection: "Upgrade",
        },
      });
      return response.status === 101;
    } catch (error) {
      console.log("WebSocket server test failed:", error);
      return false;
    }
  }

  subscribeToTicketUpdates(
    ticketId: string,
    callback: (message: WebSocketMessage) => void
  ): string {
    return this.subscribeToTopic(`/topic/tickets/${ticketId}`, callback);
  }

  subscribeToAllTickets(callback: (message: WebSocketMessage) => void): string {
    return this.subscribeToTopic("/topic/tickets", callback);
  }

  subscribeToUserUpdates(
    userId: string,
    callback: (message: WebSocketMessage) => void
  ): string {
    return this.subscribeToTopic(`/topic/users/${userId}`, callback);
  }

  subscribeToNotifications(
    callback: (message: WebSocketMessage) => void
  ): string {
    return this.subscribeToTopic("/topic/notifications", callback);
  }
}

export const stompWsService = new StompWebSocketService();
export default stompWsService;
