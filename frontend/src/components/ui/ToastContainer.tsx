import React, {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { Toast, type ToastProps } from "./Toast";
import { v4 as uuidv4 } from "uuid";

interface ToastContextType {
  showToast: (
    message: string,
    type?: ToastProps["type"],
    duration?: number
  ) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<(ToastProps & { id: string })[]>([]);

  const showToast = (
    message: string,
    type: ToastProps["type"] = "info",
    duration = 5000
  ) => {
    const id = uuidv4();
    const newToast = { id, message, type, duration, onClose: removeToast };
    setToasts((prev) => [...prev, newToast]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};
