import React, { useState } from "react";
import { Select } from "../ui/Select";
import { Toast } from "../ui/Toast";
import { useAuth } from "../../context/AuthContext";
import { apiService } from "../../services/api";
import type { User } from "../../types";

interface UserRoleManagementProps {
  users: User[];
  onUserUpdate: () => void;
}

export const UserRoleManagement: React.FC<UserRoleManagementProps> = ({
  users,
  onUserUpdate,
}) => {
  const { user: currentUser } = useAuth();
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const roleOptions = [
    { value: "CUSTOMER", label: "Customer" },
    { value: "AGENT", label: "Agent" },
    { value: "ADMIN", label: "Admin" },
  ];

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (newRole === "") return;

    setUpdatingUser(userId);
    try {
      await apiService.updateUserRole(userId, { role: newRole });

      setToastMessage("User role updated successfully!");
      setToastType("success");
      setShowToast(true);
      onUserUpdate();
    } catch (error) {
      console.error("Error updating user role:", error);
      setToastMessage("Failed to update user role");
      setToastType("error");
      setShowToast(true);
    } finally {
      setUpdatingUser(null);
    }
  };

  const canChangeRole = (targetUser: User) => {
    if (targetUser.id === currentUser?.id) return false;

    if (targetUser.role === "ADMIN") return false;

    return true;
  };

  return (
    <div className="card p-4 sm:p-6">
      <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-4">
        User Role Management
      </h3>

      <div className="block sm:hidden space-y-4">
        {users.map((user) => (
          <div
            key={user.id}
            className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {user.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {user.email}
                </div>
              </div>
              <span
                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  user.role === "ADMIN"
                    ? "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200"
                    : user.role === "AGENT"
                    ? "bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200"
                    : "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200"
                }`}
              >
                {user.role}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Role:
              </span>
              {canChangeRole(user) ? (
                <Select
                  options={roleOptions}
                  value={user.role}
                  onChange={(value) => handleRoleChange(user.id, value)}
                  disabled={updatingUser === user.id}
                  className="w-24 text-xs"
                />
              ) : (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {user.id === currentUser?.id ? "Your role" : "Cannot change"}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="hidden sm:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                User
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Current Role
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Change Role
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {user.name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {user.email}
                    </div>
                  </div>
                </td>
                <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.role === "ADMIN"
                        ? "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200"
                        : user.role === "AGENT"
                        ? "bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200"
                        : "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200"
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                  {canChangeRole(user) ? (
                    <Select
                      options={roleOptions}
                      value={user.role}
                      onChange={(value) => handleRoleChange(user.id, value)}
                      disabled={updatingUser === user.id}
                      className="w-32"
                    />
                  ) : (
                    <span className="text-sm text-gray-400 dark:text-gray-500">
                      {user.id === currentUser?.id
                        ? "Your role"
                        : "Cannot change"}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showToast && (
        <Toast
          id={`toast-${Date.now()}`}
          message={toastMessage}
          type={toastType}
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  );
};
