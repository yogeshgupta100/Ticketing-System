import React, { useState, useEffect } from "react";
import { WifiOff, AlertCircle, CheckCircle, RefreshCw } from "lucide-react";
import {
  wsService,
  type ConnectionStatus as WSConnectionStatus,
} from "../../services/websocket";
import { cn } from "../../utils/cn";

interface ConnectionStatusProps {
  className?: string;
  showText?: boolean;
  variant?: "icon" | "badge" | "full";
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  className,
  showText = true,
  variant = "badge",
}) => {
  const [status, setStatus] = useState<WSConnectionStatus>(
    wsService.getConnectionStatus()
  );
  const [isReconnecting, setIsReconnecting] = useState(false);

  const handleReconnect = async () => {
    if (isReconnecting) return;

    setIsReconnecting(true);
    try {
      await wsService.disconnect();
      await wsService.connect();
    } catch (error) {
      console.error("Manual reconnect failed:", error);
    } finally {
      setIsReconnecting(false);
    }
  };

  useEffect(() => {
    const unsubscribe = wsService.onConnectionStatusChange(setStatus);
    return unsubscribe;
  }, []);

  const getStatusIcon = () => {
    if (status.isConnecting) {
      return (
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600" />
      );
    }

    if (status.isConnected) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }

    if (status.error) {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }

    return <WifiOff className="h-4 w-4 text-gray-400" />;
  };

  const getStatusText = () => {
    if (status.isConnecting) return "Connecting...";
    if (status.isConnected) return "Connected";
    if (status.error) return "Connection Error";
    return "Disconnected";
  };

  const getStatusColor = () => {
    if (status.isConnecting)
      return "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800";
    if (status.isConnected)
      return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";
    if (status.error)
      return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
    return "text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800";
  };

  if (variant === "icon") {
    return (
      <div
        className={cn("flex items-center", className)}
        title={getStatusText()}
      >
        {getStatusIcon()}
      </div>
    );
  }

  if (variant === "badge") {
    return (
      <div
        className={cn(
          "flex items-center gap-2 px-2 py-1 rounded-full border text-xs font-medium transition-colors",
          getStatusColor(),
          className
        )}
      >
        {getStatusIcon()}
        {showText && <span>{getStatusText()}</span>}
        {status.error && (
          <button
            onClick={handleReconnect}
            disabled={isReconnecting}
            className="ml-1 p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            title="Reconnect WebSocket"
          >
            <RefreshCw
              className={cn("h-3 w-3", isReconnecting && "animate-spin")}
            />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border transition-colors",
        getStatusColor(),
        className
      )}
    >
      {getStatusIcon()}

      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{getStatusText()}</span>
          {status.reconnectAttempts > 0 && (
            <span className="text-xs opacity-75">
              (Attempt {status.reconnectAttempts})
            </span>
          )}
        </div>

        {status.error && (
          <p className="text-xs opacity-75 mt-1">{status.error}</p>
        )}
      </div>
    </div>
  );
};

export const StatusIndicator: React.FC<{ className?: string }> = ({
  className,
}) => {
  return (
    <ConnectionStatus variant="icon" showText={false} className={className} />
  );
};
