import React, { useState, useEffect } from "react";
import { Wifi, WifiOff, Clock, RefreshCw } from "lucide-react";
import {
  offlineService,
  type NetworkStatus,
  type OfflineAction,
} from "../../services/offlineService";
import { cn } from "../../utils/cn";

interface OfflineIndicatorProps {
  className?: string;
  showDetails?: boolean;
  variant?: "minimal" | "detailed" | "banner";
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  className,
  variant = "minimal",
}) => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(
    offlineService.getNetworkStatus()
  );
  const [offlineActions, setOfflineActions] = useState<OfflineAction[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const unsubscribeStatus =
      offlineService.onNetworkStatusChange(setNetworkStatus);
    const unsubscribeActions =
      offlineService.onOfflineActionsChange(setOfflineActions);

    return () => {
      unsubscribeStatus();
      unsubscribeActions();
    };
  }, []);

  const handleManualSync = async () => {
    try {
      await offlineService.manualSync();
    } catch (error) {
      console.error("Manual sync failed:", error);
    }
  };

  const getStatusIcon = () => {
    if (networkStatus.isOffline) {
      return <WifiOff className="h-4 w-4 text-red-500" />;
    }

    if (offlineActions.length > 0) {
      return <Clock className="h-4 w-4 text-yellow-500" />;
    }

    return <Wifi className="h-4 w-4 text-green-500" />;
  };

  const getStatusText = () => {
    if (networkStatus.isOffline) {
      return "Offline";
    }

    if (offlineActions.length > 0) {
      return `${offlineActions.length} pending`;
    }

    return "Online";
  };

  const getStatusColor = () => {
    if (networkStatus.isOffline) {
      return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
    }

    if (offlineActions.length > 0) {
      return "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800";
    }

    return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";
  };

  if (variant === "minimal") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {getStatusIcon()}
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {getStatusText()}
        </span>
      </div>
    );
  }

  if (variant === "banner") {
    if (networkStatus.isOnline && offlineActions.length === 0) {
      return null;
    }

    return (
      <div
        className={cn(
          "fixed top-0 left-0 right-0 z-50 p-3 border-b transition-all duration-300",
          networkStatus.isOffline
            ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"
            : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200"
        )}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <p className="font-medium">
                {networkStatus.isOffline
                  ? "You're offline"
                  : "Syncing pending changes"}
              </p>
              {offlineActions.length > 0 && (
                <p className="text-sm opacity-75">
                  {offlineActions.length} action
                  {offlineActions.length !== 1 ? "s" : ""} waiting to sync
                </p>
              )}
            </div>
          </div>

          {!networkStatus.isOffline && offlineActions.length > 0 && (
            <button
              onClick={handleManualSync}
              className="flex items-center gap-2 px-3 py-1 text-sm font-medium rounded-md hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Sync Now
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 hover:shadow-sm",
          getStatusColor()
        )}
        aria-label="Network status"
        aria-expanded={isExpanded}
      >
        {getStatusIcon()}
        <span className="text-sm font-medium">{getStatusText()}</span>

        {offlineActions.length > 0 && (
          <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-white dark:bg-gray-800 rounded-full text-gray-900 dark:text-white">
            {offlineActions.length}
          </span>
        )}
      </button>

      {isExpanded && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Network Status
              </h3>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
              >
                ×
              </button>
            </div>

            <div className="mb-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
              <div className="flex items-center gap-2 mb-2">
                {getStatusIcon()}
                <span className="font-medium text-gray-900 dark:text-white">
                  {networkStatus.isOnline ? "Online" : "Offline"}
                </span>
              </div>

              {networkStatus.connectionType && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Connection: {networkStatus.connectionType}
                </p>
              )}

              {networkStatus.lastSeen && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Last seen: {networkStatus.lastSeen.toLocaleTimeString()}
                </p>
              )}
            </div>

            {offlineActions.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Pending Actions
                  </h4>
                  <button
                    onClick={handleManualSync}
                    className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Sync All
                  </button>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {offlineActions.map((action) => (
                    <div
                      key={action.id}
                      className="flex items-center justify-between p-2 rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {action.type.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {new Date(action.timestamp).toLocaleTimeString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {action.retryCount > 0 && (
                          <span className="text-xs text-yellow-600 dark:text-yellow-400">
                            Retry {action.retryCount}/{action.maxRetries}
                          </span>
                        )}

                        <button
                          onClick={() =>
                            offlineService.removeOfflineAction(action.id)
                          }
                          className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setIsExpanded(false)}
                className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
              >
                Close
              </button>

              {offlineActions.length > 0 && (
                <button
                  onClick={handleManualSync}
                  className="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Sync Now
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const StatusDot: React.FC<{ className?: string }> = ({ className }) => {
  const [networkStatus] = useState<NetworkStatus>(
    offlineService.getNetworkStatus()
  );
  const [offlineActions] = useState<OfflineAction[]>([]);

  const getDotColor = () => {
    if (networkStatus.isOffline) return "bg-red-500";
    if (offlineActions.length > 0) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div
      className={cn(
        "w-2 h-2 rounded-full transition-colors duration-200",
        getDotColor(),
        className
      )}
      title={
        networkStatus.isOffline
          ? "Offline"
          : offlineActions.length > 0
          ? `${offlineActions.length} pending`
          : "Online"
      }
    />
  );
};
