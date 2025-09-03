import { config } from "../config";

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

class WebSocketService {
  private ws: WebSocket | null = null;
  private subscriptions = new Map<string, WebSocketSubscription>();
  private connectionStatus: ConnectionStatus = {
    isConnected: false,
    isConnecting: false,
    reconnectAttempts: 0,
  };
  private statusListeners: ((status: ConnectionStatus) => void)[] = [];
  private reconnectTimer: NodeJS.Timeout | null = null;
  private messageQueue: WebSocketMessage[] = [];
  private clientId: string | null = null;

  constructor() {}

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

      const token = localStorage.getItem("auth_token");
      console.log("🔑 Token check:", token ? "Token found" : "No token");

      if (!token) {
        throw new Error(
          "No authentication token available. Please log in first."
        );
      }

      if (token.trim() === "") {
        throw new Error("Authentication token is empty. Please log in again.");
      }

      this.ws = new WebSocket(config.wsUrl);
      this.setupEventHandlers();

      await new Promise((resolve, reject) => {
        if (!this.ws) {
          reject(new Error("WebSocket not initialized"));
          return;
        }

        this.ws.onopen = () => {
          console.log("WebSocket connected, sending STOMP CONNECT frame");
          this.sendStompConnect(token);
          resolve(undefined);
        };

        this.ws.onerror = (error) => {
          reject(new Error("WebSocket connection failed"));
        };

        setTimeout(() => {
          reject(new Error("WebSocket connection timeout"));
        }, 10000);
      });
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
          error.message.includes("NetworkError") ||
          error.message.includes("timeout"))
      ) {
        console.log(
          "WebSocket server not available, skipping reconnect attempts"
        );
        return;
      }

      this.scheduleReconnect();
    }
  }

  private sendStompConnect(token: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const connectFrame = [
      "CONNECT",
      `authorization:Bearer ${token}`,
      `x-auth-token:${token}`,
      "accept-version:1.2",
      "heart-beat:4000,4000",
      "",
      "",
    ].join("\n");

    this.ws.send(connectFrame);
  }

  private setupEventHandlers() {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log("🔌 WebSocket connection opened");
    };

    this.ws.onmessage = (event) => {
      try {
        const message = event.data.toString();
        const lines = message.split("\n");
        const command = lines[0];

        if (command === "CONNECTED") {
          console.log("STOMP connection established");
          this.connectionStatus.isConnected = true;
          this.connectionStatus.isConnecting = false;
          this.connectionStatus.error = undefined;
          this.connectionStatus.reconnectAttempts = 0;
          this.notifyStatusChange();
          this.processMessageQueue();
          this.resubscribeAll();
        } else if (command === "MESSAGE") {
          const headers: Record<string, string> = {};
          let body = "";
          let i = 1;

          console.log("Processing STOMP MESSAGE frame:", lines);

          for (; i < lines.length; i++) {
            const line = lines[i];
            if (line === "") break;
            const colonIndex = line.indexOf(":");
            if (colonIndex !== -1) {
              const key = line.substring(0, colonIndex);
              const value = line.substring(colonIndex + 1);
              headers[key] = value;
            }
          }

          console.log("📨 Parsed headers:", headers);

          if (i < lines.length) {
            body = lines.slice(i + 1).join("\n");
          }

          console.log("📨 Message body:", body);

          if (body) {
            try {
              const parsedMessage = JSON.parse(body);
              console.log("📨 Parsed JSON message:", parsedMessage);

              const wsMessage: WebSocketMessage = {
                type: parsedMessage.type,
                payload: parsedMessage.payload || parsedMessage,
                timestamp: Date.now(),
              };

              console.log("📨 Created WebSocket message:", wsMessage);
              console.log(
                "📨 Broadcasting to subscribers:",
                this.subscriptions.size
              );

              this.broadcastMessage(wsMessage);
            } catch (error) {
              console.error("Failed to parse WebSocket message:", error);
              console.error("Raw body:", body);
            }
          } else {
            console.log("No message body found in STOMP MESSAGE frame");
          }
        } else if (command === "ERROR") {
          console.error("❌ STOMP error received:", message);
          this.connectionStatus.error = "STOMP error occurred";
          this.notifyStatusChange();
        }
      } catch (error) {
        console.error("Error handling WebSocket message:", error);
      }
    };

    this.ws.onclose = () => {
      console.log("🔌 WebSocket connection closed");
      this.connectionStatus.isConnected = false;
      this.connectionStatus.isConnecting = false;
      this.notifyStatusChange();

      if (this.connectionStatus.reconnectAttempts < 2) {
        this.scheduleReconnect();
      } else {
        console.log("Max reconnection attempts reached, stopping reconnection");
      }
    };

    this.ws.onerror = (error) => {
      console.error("❌ WebSocket error:", error);
      this.connectionStatus.error = "WebSocket connection failed";
      this.connectionStatus.isConnecting = false;
      this.notifyStatusChange();

      console.log("WebSocket error occurred, not attempting reconnect");
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

    console.log(`Subscription created: ${subscriptionId} -> ${topic}`);
    console.log(`Total subscriptions: ${this.subscriptions.size}`);
    console.log(
      `Current subscriptions:`,
      Array.from(this.subscriptions.entries()).map(
        ([id, sub]) => `${id}: ${sub.topic}`
      )
    );

    if (this.connectionStatus.isConnected && this.ws) {
      const subscribeFrame = [
        "SUBSCRIBE",
        `id:${subscriptionId}`,
        `destination:${topic}`,
        "",
        "",
      ].join("\n");

      this.ws.send(subscribeFrame);
      console.log(`STOMP SUBSCRIBE frame sent for topic: ${topic}`);
      console.log(`SUBSCRIBE frame content:`, subscribeFrame);
    } else {
      console.log(`⚠️ Cannot subscribe to ${topic}: WebSocket not connected`);
    }

    return subscriptionId;
  }

  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription && this.connectionStatus.isConnected && this.ws) {
      const unsubscribeFrame = [
        "UNSUBSCRIBE",
        `id:${subscriptionId}`,
        "",
        "",
      ].join("\n");

      this.ws.send(unsubscribeFrame);
      this.subscriptions.delete(subscriptionId);
      console.log(`Unsubscribed from topic: ${subscription.topic}`);
    }
  }

  private broadcastMessage(message: WebSocketMessage) {
    console.log(
      `📢 Broadcasting message to ${this.subscriptions.size} subscriptions:`,
      message
    );

    if (this.subscriptions.size === 0) {
      console.log("⚠️ No subscriptions to broadcast to");
      return;
    }

    this.subscriptions.forEach((subscription) => {
      try {
        console.log(
          `📢 Calling callback for subscription ${subscription.id} -> ${subscription.topic}`
        );
        subscription.callback(message);
        console.log(`✅ Callback executed successfully for ${subscription.id}`);
      } catch (error) {
        console.error(
          `❌ Error in subscription callback for ${subscription.id}:`,
          error
        );
      }
    });
  }

  sendMessage(destination: string, message: any): void {
    if (this.connectionStatus.isConnected && this.ws) {
      const sendFrame = [
        "SEND",
        `destination:${destination}`,
        "content-type:application/json",
        "",
        JSON.stringify(message),
      ].join("\n");

      this.ws.send(sendFrame);
    } else {
      this.messageQueue.push({
        type: "TICKET_UPDATED",
        payload: message,
        timestamp: Date.now(),
      });
    }
  }

  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws && this.connectionStatus.isConnected) {
      const disconnectFrame = ["DISCONNECT", "", "", ""].join("\n");
      this.ws.send(disconnectFrame);

      await new Promise((resolve) => setTimeout(resolve, 100));

      this.ws.close();
    }

    this.connectionStatus.isConnected = false;
    this.connectionStatus.isConnecting = false;
    this.notifyStatusChange();
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
    return this.subscribeToTopic(`/topic/ticket/${ticketId}`, callback);
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

export const wsService = new WebSocketService();
export default wsService;
