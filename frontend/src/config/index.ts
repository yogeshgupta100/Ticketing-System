export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api",
  wsUrl: import.meta.env.VITE_WS_URL || "ws://localhost:8080/ws",

  environment:
    import.meta.env.VITE_NODE_ENV || import.meta.env.MODE || "development",
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,

  features: {
    analytics: import.meta.env.VITE_ENABLE_ANALYTICS === "true",
    fileUpload: import.meta.env.VITE_ENABLE_FILE_UPLOAD === "true",
    offlineMode: import.meta.env.VITE_ENABLE_OFFLINE_MODE === "true",
    serviceWorker: import.meta.env.VITE_ENABLE_SERVICE_WORKER === "true",
    cache: import.meta.env.VITE_ENABLE_CACHE === "true",
  },

  security: {
    jwtStorageType: import.meta.env.VITE_JWT_STORAGE_TYPE || "secure",
    enableHttpsOnlyCookies:
      import.meta.env.VITE_ENABLE_HTTPS_ONLY_COOKIES === "true",
  },

  websocket: {
    reconnectAttempts: parseInt(
      import.meta.env.VITE_WS_RECONNECT_ATTEMPTS || "5"
    ),
    reconnectInterval: parseInt(
      import.meta.env.VITE_WS_RECONNECT_INTERVAL || "3000"
    ),
  },

  app: {
    name: "Ticketing System",
    version: "1.0.0",
    maxFileSize: 10 * 1024 * 1024,
    supportedFileTypes: [
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".pdf",
      ".doc",
      ".docx",
      ".txt",
    ],
  },
} as const;

export type Config = typeof config;
export type FeatureFlags = typeof config.features;
export type SecurityConfig = typeof config.security;
export type WebSocketConfig = typeof config.websocket;
