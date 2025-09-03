import React from "react";
import { useAuth } from "../../context/AuthContext";
import { Loading } from "../ui/Loading";

interface RoleBasedRouteProps {
  children: React.ReactNode;
  allowedRoles: ("CUSTOMER" | "AGENT" | "ADMIN")[];
  fallback?: React.ReactNode;
}

export const RoleBasedRoute: React.FC<RoleBasedRouteProps> = ({
  children,
  allowedRoles,
  fallback,
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loading size="xl" text="Loading..." />
      </div>
    );
  }

  if (!user) {
    return (
      fallback || (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Access Denied
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Please log in to access this page.
            </p>
          </div>
        </div>
      )
    );
  }

  if (!allowedRoles.includes(user.role)) {
    return (
      fallback || (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Access Denied
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              You don't have permission to access this page.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Required roles: {allowedRoles.join(", ")} | Your role: {user.role}
            </p>
          </div>
        </div>
      )
    );
  }

  return <>{children}</>;
};
