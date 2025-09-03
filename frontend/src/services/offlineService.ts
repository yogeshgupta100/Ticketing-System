export interface NetworkStatus {
  isOnline: boolean;
  isOffline: boolean;
  connectionType?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  lastSeen?: Date;
}

export interface OfflineAction {
  id: string;
  type: "CREATE_TICKET" | "UPDATE_TICKET" | "CREATE_MESSAGE" | "UPDATE_USER";
  payload: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

class OfflineService {
  private networkStatus: NetworkStatus = {
    isOnline: navigator.onLine,
    isOffline: !navigator.onLine,
    lastSeen: new Date(),
  };

  private offlineActions: OfflineAction[] = [];
  private listeners: ((status: NetworkStatus) => void)[] = [];
  private actionListeners: ((actions: OfflineAction[]) => void)[] = [];
  private syncInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    this.loadOfflineActions();

    window.addEventListener("online", this.handleOnline.bind(this));
    window.addEventListener("offline", this.handleOffline.bind(this));

    if ("connection" in navigator) {
      (navigator as any).connection?.addEventListener(
        "change",
        this.handleConnectionChange.bind(this)
      );
    }

    this.startSyncInterval();

    this.updateNetworkStatus();
  }

  private handleOnline(): void {
    this.networkStatus.isOnline = true;
    this.networkStatus.isOffline = false;
    this.networkStatus.lastSeen = new Date();

    this.updateNetworkStatus();
    this.syncOfflineActions();
  }

  private handleOffline(): void {
    this.networkStatus.isOnline = false;
    this.networkStatus.isOffline = true;

    this.updateNetworkStatus();
  }

  private handleConnectionChange(): void {
    if ("connection" in navigator) {
      const connection = (navigator as any).connection;
      this.networkStatus.connectionType = connection.effectiveType;
      this.networkStatus.effectiveType = connection.effectiveType;
      this.networkStatus.downlink = connection.downlink;
      this.networkStatus.rtt = connection.rtt;
    }

    this.updateNetworkStatus();
  }

  private updateNetworkStatus(): void {
    this.networkStatus.isOnline = navigator.onLine;
    this.networkStatus.isOffline = !navigator.onLine;

    if ("connection" in navigator) {
      const connection = (navigator as any).connection;
      this.networkStatus.connectionType = connection.effectiveType;
      this.networkStatus.effectiveType = connection.effectiveType;
      this.networkStatus.downlink = connection.downlink;
      this.networkStatus.rtt = connection.rtt;
    }

    this.notifyListeners();
  }

  private startSyncInterval(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      if (this.networkStatus.isOnline && this.offlineActions.length > 0) {
        this.syncOfflineActions();
      }
    }, 30000);
  }

  private async syncOfflineActions(): Promise<void> {
    if (!this.networkStatus.isOnline || this.offlineActions.length === 0) {
      return;
    }

    const actionsToProcess = [...this.offlineActions];
    const successfulActions: string[] = [];
    const failedActions: OfflineAction[] = [];

    for (const action of actionsToProcess) {
      try {
        await this.processOfflineAction(action);
        successfulActions.push(action.id);
      } catch (error) {
        console.error(`Failed to process offline action ${action.id}:`, error);

        if (action.retryCount < action.maxRetries) {
          action.retryCount++;
          failedActions.push(action);
        } else {
          console.error(`Action ${action.id} exceeded max retries, removing`);
        }
      }
    }

    this.offlineActions = this.offlineActions.filter(
      (action) => !successfulActions.includes(action.id)
    );

    failedActions.forEach((failedAction) => {
      const index = this.offlineActions.findIndex(
        (action) => action.id === failedAction.id
      );
      if (index !== -1) {
        this.offlineActions[index] = failedAction;
      }
    });

    this.saveOfflineActions();
    this.notifyActionListeners();
  }

  private async processOfflineAction(action: OfflineAction): Promise<void> {
    switch (action.type) {
      case "CREATE_TICKET":
        break;
      case "UPDATE_TICKET":
        break;
      case "CREATE_MESSAGE":
        break;
      case "UPDATE_USER":
        break;
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  addOfflineAction(
    type: OfflineAction["type"],
    payload: any,
    maxRetries: number = 3
  ): string {
    const action: OfflineAction = {
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      payload,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries,
    };

    this.offlineActions.push(action);
    this.saveOfflineActions();
    this.notifyActionListeners();

    return action.id;
  }

  removeOfflineAction(actionId: string): boolean {
    const initialLength = this.offlineActions.length;
    this.offlineActions = this.offlineActions.filter(
      (action) => action.id !== actionId
    );

    if (this.offlineActions.length !== initialLength) {
      this.saveOfflineActions();
      this.notifyActionListeners();
      return true;
    }

    return false;
  }

  getOfflineActions(): OfflineAction[] {
    return [...this.offlineActions];
  }

  getOfflineActionsByType(type: OfflineAction["type"]): OfflineAction[] {
    return this.offlineActions.filter((action) => action.type === type);
  }

  clearOfflineActions(): void {
    this.offlineActions = [];
    this.saveOfflineActions();
    this.notifyActionListeners();
  }

  private saveOfflineActions(): void {
    try {
      localStorage.setItem(
        "offlineActions",
        JSON.stringify(this.offlineActions)
      );
    } catch (error) {
      console.error("Failed to save offline actions:", error);
    }
  }

  private loadOfflineActions(): void {
    try {
      const saved = localStorage.getItem("offlineActions");
      if (saved) {
        this.offlineActions = JSON.parse(saved);
      }
    } catch (error) {
      console.error("Failed to load offline actions:", error);
      this.offlineActions = [];
    }
  }

  onNetworkStatusChange(callback: (status: NetworkStatus) => void): () => void {
    this.listeners.push(callback);

    callback(this.networkStatus);

    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  onOfflineActionsChange(
    callback: (actions: OfflineAction[]) => void
  ): () => void {
    this.actionListeners.push(callback);

    callback(this.offlineActions);

    return () => {
      const index = this.actionListeners.indexOf(callback);
      if (index > -1) {
        this.actionListeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((callback) => {
      try {
        callback(this.networkStatus);
      } catch (error) {
        console.error("Error in network status listener:", error);
      }
    });
  }

  private notifyActionListeners(): void {
    this.actionListeners.forEach((callback) => {
      try {
        callback(this.offlineActions);
      } catch (error) {
        console.error("Error in offline actions listener:", error);
      }
    });
  }

  getNetworkStatus(): NetworkStatus {
    return { ...this.networkStatus };
  }

  isOnline(): boolean {
    return this.networkStatus.isOnline;
  }

  isOffline(): boolean {
    return this.networkStatus.isOffline;
  }

  hasOfflineActions(): boolean {
    return this.offlineActions.length > 0;
  }

  getOfflineActionsCount(): number {
    return this.offlineActions.length;
  }

  shouldQueueAction(): boolean {
    return this.networkStatus.isOffline;
  }

  async manualSync(): Promise<void> {
    if (this.networkStatus.isOnline) {
      await this.syncOfflineActions();
    }
  }

  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    window.removeEventListener("online", this.handleOnline.bind(this));
    window.removeEventListener("offline", this.handleOffline.bind(this));

    if ("connection" in navigator) {
      (navigator as any).connection?.removeEventListener(
        "change",
        this.handleConnectionChange.bind(this)
      );
    }
  }
}

export const offlineService = new OfflineService();
export default offlineService;
