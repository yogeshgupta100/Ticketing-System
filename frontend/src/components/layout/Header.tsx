import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { usePermissions } from "../../shared/hooks/usePermissions";
import { Button } from "../ui/Button";
import { ConnectionStatus } from "../ui/ConnectionStatus";
import { ThemeToggle } from "../ui/ThemeToggle";
import { Headphones, LogOut, User, Settings, Bell } from "lucide-react";
import { useTickets } from "../../shared/hooks/useTickets";

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const permissions = usePermissions();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [readNotifications, setReadNotifications] = useState<Set<string>>(
    new Set()
  );
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  const { tickets } = useTickets({});

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setShowUserMenu(false);
      }
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (tickets && tickets.length > 0) {
      const recentUpdates = tickets
        .filter((ticket) => {
          const lastUpdate = new Date(ticket.updatedAt || ticket.createdAt);
          const now = new Date();
          const diffInMinutes =
            (now.getTime() - lastUpdate.getTime()) / (1000 * 60);
          return diffInMinutes < 5;
        })
        .map((ticket) => ({
          id: ticket.id,
          title: `Ticket "${ticket.title}" updated`,
          message: `Status: ${ticket.status}`,
          timestamp: ticket.updatedAt || ticket.createdAt,
          type: "ticket_update",
        }));

      setNotifications(recentUpdates);
    }
  }, [tickets]);

  const handleNotificationClick = (notificationId: string) => {
    setReadNotifications((prev) => new Set([...prev, notificationId]));
  };

  const unreadCount = notifications.filter(
    (n) => !readNotifications.has(n.id)
  ).length;

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-3">
          <div className="bg-primary-600 p-2 rounded-lg">
            <Headphones className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
              Ticketing System
            </h1>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end space-x-2 sm:space-x-4">
          <div className="hidden sm:block">
            <ConnectionStatus variant="badge" showText={true} />
          </div>

          <ThemeToggle />

          <div className="relative" ref={notificationRef}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50 border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto">
                <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    Notifications
                  </h3>
                </div>
                {notifications.length > 0 ? (
                  notifications.map((notification) => {
                    const isRead = readNotifications.has(notification.id);
                    return (
                      <div
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification.id)}
                        className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-600 last:border-b-0 cursor-pointer transition-colors ${
                          isRead ? "opacity-60" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p
                              className={`text-sm font-medium ${
                                isRead
                                  ? "text-gray-600 dark:text-gray-400"
                                  : "text-gray-900 dark:text-white"
                              }`}
                            >
                              {notification.title}
                            </p>
                            <p
                              className={`text-xs ${
                                isRead
                                  ? "text-gray-400 dark:text-gray-500"
                                  : "text-gray-500 dark:text-gray-400"
                              } mt-1`}
                            >
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                              {new Date(
                                notification.timestamp
                              ).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    No new notifications
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="relative" ref={userMenuRef}>
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="hidden sm:flex items-center space-x-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {user?.name}
                </span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50 border border-gray-200 dark:border-gray-700">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {user?.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {user?.email}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize mt-1">
                    Role: {user?.role?.toLowerCase()}
                  </p>
                </div>

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <LogOut className="h-4 w-4 mr-2 inline" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
