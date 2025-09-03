import { WebSocketServer } from "ws";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

class StompWebSocketService {
  constructor() {
    this.wss = null;
    this.connectedClients = new Map();
    this.subscriptions = new Map();
  }

  initialize(server) {
    this.wss = new WebSocketServer({
      server,
      path: "/ws",
    });

    this.wss.on("connection", this.handleConnection.bind(this));
    this.wss.on("error", (error) => {
      console.error("WebSocket server error:", error);
    });

    console.log("STOMP WebSocket server initialized on /ws");
    console.log("WebSocket server ready for connections");
  }

  handleConnection(ws, request) {
    let clientId = null;
    let user = null;
    let isAuthenticated = false;

    console.log(
      "New WebSocket connection attempt from:",
      request.headers.origin || "unknown"
    );

    ws.on("message", async (data) => {
      try {
        const message = data.toString();
        const lines = message.split("\n");
        const command = lines[0];

        if (command === "CONNECT") {
          const headers = {};
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (line === "") break;
            const colonIndex = line.indexOf(":");
            if (colonIndex !== -1) {
              const key = line.substring(0, colonIndex);
              const value = line.substring(colonIndex + 1);
              headers[key] = value;
            }
          }

          const token = headers.authorization || headers["x-auth-token"];
          if (token) {
            try {
              const cleanToken = token.replace("Bearer ", "");
              const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET);
              user = await User.findById(decoded.id).select("-password");

              if (user && user.isActive) {
                isAuthenticated = true;
                clientId = `client_${Date.now()}_${Math.random()
                  .toString(36)
                  .substr(2, 9)}`;

                this.connectedClients.set(clientId, {
                  ws,
                  user,
                  connectedAt: new Date(),
                  subscriptions: new Set(),
                });

                const connectedFrame = [
                  "CONNECTED",
                  "version:1.2",
                  "heart-beat:4000,4000",
                  "",
                  "",
                ].join("\n");

                ws.send(connectedFrame);
                console.log(
                  `STOMP client connected: ${user.name} (${user.role}) - Client: ${clientId}`
                );
              }
            } catch (error) {
              console.error("STOMP authentication error:", error.message);
            }
          }

          if (!isAuthenticated) {
            const errorFrame = [
              "ERROR",
              "message:Authentication failed",
              "content-type:text/plain",
              "",
              "Authentication failed",
            ].join("\n");

            ws.send(errorFrame);
            ws.close();
            return;
          }
        } else if (command === "SUBSCRIBE" && isAuthenticated) {
          const headers = {};
          let subscriptionId = null;
          let destination = null;

          for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (line === "") break;
            const colonIndex = line.indexOf(":");
            if (colonIndex !== -1) {
              const key = line.substring(0, colonIndex);
              const value = line.substring(colonIndex + 1);
              headers[key] = value;
            }
          }

          subscriptionId = headers.id;
          destination = headers.destination;

          if (subscriptionId && destination) {
            if (!this.subscriptions.has(destination)) {
              this.subscriptions.set(destination, new Set());
            }
            this.subscriptions.get(destination).add(clientId);

            const client = this.connectedClients.get(clientId);
            if (client) {
              client.subscriptions.add(destination);
            }

            console.log(
              `Subscription added: Client ${clientId} -> ${destination}`
            );
            console.log(
              `Total subscriptions for ${destination}: ${
                this.subscriptions.get(destination).size
              }`
            );
            console.log(
              `All active subscriptions:`,
              Array.from(this.subscriptions.entries()).map(
                ([topic, clients]) => `${topic}: ${clients.size} clients`
              )
            );

            if (headers.receipt) {
              const receiptFrame = [
                "RECEIPT",
                `receipt-id:${headers.receipt}`,
                "",
                "",
              ].join("\n");
              ws.send(receiptFrame);
            }

            console.log(
              `STOMP subscription: ${user.name} subscribed to ${destination}`
            );
          }
        } else if (command === "UNSUBSCRIBE" && isAuthenticated) {
          const headers = {};
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (line === "") break;
            const colonIndex = line.indexOf(":");
            if (colonIndex !== -1) {
              const key = line.substring(0, colonIndex);
              const value = line.substring(colonIndex + 1);
              headers[key] = value;
            }
          }

          const subscriptionId = headers.id;
          if (subscriptionId) {
            const client = this.connectedClients.get(clientId);
            if (client) {
              client.subscriptions.forEach((destination) => {
                const topicSubs = this.subscriptions.get(destination);
                if (topicSubs) {
                  topicSubs.delete(clientId);
                  if (topicSubs.size === 0) {
                    this.subscriptions.delete(destination);
                  }
                }
              });
              client.subscriptions.clear();
            }
          }
        } else if (command === "SEND" && isAuthenticated) {
          const headers = {};
          let destination = null;
          let body = "";

          let i = 1;
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

          if (i < lines.length) {
            body = lines.slice(i + 1).join("\n");
          }

          destination = headers.destination;
          if (destination && body) {
            try {
              const message = JSON.parse(body);
              this.handleClientMessage(clientId, destination, message, user);
            } catch (error) {
              console.error("Error parsing client message:", error);
            }
          }
        } else if (command === "DISCONNECT" && isAuthenticated) {
          this.handleDisconnect(clientId);
          ws.close();
        }
      } catch (error) {
        console.error("Error handling STOMP message:", error);
      }
    });

    ws.on("close", () => {
      if (clientId) {
        this.handleDisconnect(clientId);
      }
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      if (clientId) {
        this.handleDisconnect(clientId);
      }
    });
  }

  handleDisconnect(clientId) {
    const client = this.connectedClients.get(clientId);
    if (client) {
      console.log(
        `STOMP client disconnected: ${client.user.name} - Client: ${clientId}`
      );

      client.subscriptions.forEach((destination) => {
        const topicSubs = this.subscriptions.get(destination);
        if (topicSubs) {
          topicSubs.delete(clientId);
          if (topicSubs.size === 0) {
            this.subscriptions.delete(destination);
          }
        }
      });

      this.connectedClients.delete(clientId);
    }
  }

  handleClientMessage(clientId, destination, message, user) {
    console.log(`STOMP message: ${user.name} sent to ${destination}`);

    if (destination.startsWith("/app/ticket/")) {
      const ticketId = destination.split("/")[3];
      this.broadcastToTopic(`/topic/ticket/${ticketId}`, {
        ...message,
        userId: user._id,
        userName: user.name,
        timestamp: new Date().toISOString(),
      });
    }
  }

  broadcastTicketUpdate(ticketId, updateType, data) {
    try {
      const message = {
        type: "TICKET_UPDATED",
        ticketId,
        updateType,
        data,
        timestamp: new Date().toISOString(),
      };

      this.broadcastToTopic(`/topic/ticket/${ticketId}`, message);
      this.broadcastToTopic("/topic/tickets", message);

      console.log(`STOMP broadcast: Ticket ${ticketId} update sent`);
    } catch (error) {
      console.error(`WebSocket broadcast error for ticket ${ticketId}:`, error);
    }
  }

  broadcastNewMessage(ticketId, message) {
    try {
      const wsMessage = {
        type: "MESSAGE_CREATED",
        ticketId,
        message,
        timestamp: new Date().toISOString(),
      };

      console.log(
        `Broadcasting new message for ticket ${ticketId}:`,
        wsMessage
      );
      console.log(`Total connected clients: ${this.connectedClients.size}`);
      console.log(`Total subscriptions: ${this.subscriptions.size}`);

      this.broadcastToTopic(`/topic/ticket/${ticketId}`, wsMessage);
      this.broadcastToTopic("/topic/tickets", wsMessage);
      console.log(`STOMP broadcast: New message for ticket ${ticketId} sent`);
    } catch (error) {
      console.error(`WebSocket broadcast error for ticket ${ticketId}:`, error);
    }
  }

  broadcastUserUpdate(userId, updateType, data) {
    try {
      const message = {
        type: "USER_UPDATED",
        userId,
        updateType,
        data,
        timestamp: new Date().toISOString(),
      };

      this.broadcastToTopic("/topic/users", message);
      console.log(`STOMP broadcast: User ${userId} update sent`);
    } catch (error) {
      console.error(`WebSocket broadcast error for user ${userId}:`, error);
    }
  }

  broadcastToTopic(destination, message) {
    try {
      const subscribers = this.subscriptions.get(destination);
      console.log(
        `Broadcasting to ${destination}: ${
          subscribers ? subscribers.size : 0
        } subscribers`
      );
      if (!subscribers || subscribers.size === 0) return;

      const messageFrame = [
        "MESSAGE",
        `destination:${destination}`,
        `content-type:application/json`,
        "",
        JSON.stringify(message),
      ].join("\n");

      subscribers.forEach((clientId) => {
        const client = this.connectedClients.get(clientId);
        if (client) {
          try {
            client.ws.send(messageFrame);
            console.log(
              `Message sent to client ${clientId} (${client.user.name})`
            );
          } catch (error) {
            console.error(`Error sending to client ${clientId}:`, error);
          }
        } else {
          console.log(`Client ${clientId} not found in connectedClients`);
        }
      });
    } catch (error) {
      console.error(`Error broadcasting to topic ${destination}:`, error);
    }
  }

  getConnectionStatus() {
    return {
      isConnected: this.wss !== null,
      connectedClients: this.connectedClients.size,
      uptime: this.wss ? process.uptime() : 0,
    };
  }
  close() {
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
    this.connectedClients.clear();
    this.subscriptions.clear();
    console.log("STOMP WebSocket server closed");
  }
}

export const stompWebSocketService = new StompWebSocketService();
export default stompWebSocketService;
