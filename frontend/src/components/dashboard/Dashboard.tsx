import React, { useState } from "react";
import { Header } from "../layout/Header";
import { TicketDetail } from "../tickets/TicketDetail";
import { KanbanBoard } from "../tickets/KanbanBoard";
import { UserRoleManagement } from "./UserRoleManagement";
import { CreateTicketModal } from "../tickets/CreateTicketModal";
import { usePermissions } from "../../shared/hooks/usePermissions";
import { useAuth } from "../../context/AuthContext";
import { useTickets } from "../../shared/hooks/useTickets";
import { useUsers } from "../../shared/hooks/useUsers";
import { apiService } from "../../services/api";

export const Dashboard: React.FC = () => {
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"tickets" | "analytics" | "users">(
    "tickets"
  );
  const [showCreateTicket, setShowCreateTicket] = useState(false);
  const { user } = useAuth();
  const permissions = usePermissions();
  const { users, loading: usersLoading, refreshUsers } = useUsers();
  const getTicketFilters = () => {
    if (!user) return {};

    switch (user.role) {
      case "ADMIN":
        return {};
      case "AGENT":
        return { assigneeId: user.id };
      case "CUSTOMER":
        return { customerId: user.id };
      default:
        return {};
    }
  };

  const getAnalyticsData = () => {
    if (!tickets)
      return { total: 0, open: 0, pending: 0, resolved: 0, closed: 0 };

    const total = tickets.length;
    const open = tickets.filter((t) => t.status === "OPEN").length;
    const inProgress = tickets.filter((t) => t.status === "IN_PROGRESS").length;
    const resolved = tickets.filter((t) => t.status === "RESOLVED").length;
    const closed = tickets.filter((t) => t.status === "CLOSED").length;

    return { total, open, inProgress, resolved, closed };
  };

  const getRoleDescription = (role?: string) => {
    switch (role) {
      case "ADMIN":
        return "Full access to all tickets, can assign tickets to agents";
      case "AGENT":
        return "Access to assigned tickets and unassigned tickets";
      case "CUSTOMER":
        return "Create, view, edit, and update status of your own tickets only";
      default:
        return "Manage your support tickets and requests";
    }
  };

  const ticketFilters = React.useMemo(
    () => getTicketFilters(),
    [user?.role, user?.id]
  );

  const {
    tickets,
    loading: ticketsLoading,
    updateTicketStatusOptimistically,
  } = useTickets(ticketFilters);

  const handleTicketSelect = (ticketId: string) => {
    setSelectedTicketId(ticketId);
  };

  const handleBackToList = () => {
    setSelectedTicketId(null);
  };

  const handleTicketStatusChange = async (
    ticketId: string,
    newStatus: string
  ) => {
    try {
      updateTicketStatusOptimistically(ticketId, newStatus);

      const updateData: any = {
        status: newStatus as "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED",
      };

      if (user?.role === "ADMIN" && newStatus === "IN_PROGRESS") {
        updateData.assignedById = user.id;
      } else if (user?.role === "CUSTOMER") {
        updateData.assignedById = user.id;
      }

      await apiService.updateTicket(ticketId, updateData);
    } catch (error) {
      console.error("Error updating ticket status:", error);
      updateTicketStatusOptimistically(ticketId, "OPEN");
    }
  };

  const handleCreateTicket = () => {
    setShowCreateTicket(true);
  };

  const handleUserUpdate = () => {
    refreshUsers();
  };

  const handleTicketUpdate = async (
    ticketId: string,
    updates: {
      title?: string;
      description?: string;
      priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
      tags?: string[];
    }
  ) => {
    try {
      await apiService.updateTicket(ticketId, updates);
    } catch (error) {
      console.error("Failed to update ticket:", error);
    }
  };

  const renderTicketsSection = () => (
    <>
      {ticketsLoading ? (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading tickets...</p>
          </div>
        </div>
      ) : selectedTicketId ? (
        <TicketDetail ticketId={selectedTicketId} onBack={handleBackToList} />
      ) : (
        <KanbanBoard
          tickets={tickets || []}
          onTicketSelect={handleTicketSelect}
          onTicketStatusChange={handleTicketStatusChange}
          onTicketUpdate={handleTicketUpdate}
          onCreateTicket={handleCreateTicket}
          userRole={user?.role}
          canEditTickets={true}
          canChangeStatus={true}
        />
      )}
    </>
  );

  const renderAnalyticsSection = () => {
    const analytics = getAnalyticsData();

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            {user?.role === "ADMIN"
              ? "All Tickets Analytics"
              : user?.role === "AGENT"
              ? "Your Assigned Tickets"
              : "Your Tickets Analytics"}
          </h2>
          {user?.role === "ADMIN" && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Full system overview
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <h3 className="text-base sm:text-lg font-semibold text-blue-900 dark:text-blue-100">
              Total Tickets
            </h3>
            <p className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">
              {analytics.total}
            </p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <h3 className="text-base sm:text-lg font-semibold text-green-900 dark:text-green-100">
              Open
            </h3>
            <p className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">
              {analytics.open}
            </p>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <h3 className="text-base sm:text-lg font-semibold text-yellow-900 dark:text-yellow-100">
              In Progress
            </h3>
            <p className="text-2xl sm:text-3xl font-bold text-yellow-600 dark:text-yellow-400">
              {analytics.inProgress}
            </p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
            <h3 className="text-base sm:text-lg font-semibold text-purple-900 dark:text-purple-100">
              Resolved
            </h3>
            <p className="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400">
              {analytics.resolved}
            </p>
          </div>
        </div>

        {user?.role === "AGENT" && (
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Agent Insights
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              You have {analytics.open} open tickets and {analytics.inProgress}{" "}
              in progress. Focus on resolving these to improve customer
              satisfaction.
            </p>
          </div>
        )}

        {user?.role === "CUSTOMER" && (
          <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">
              Your Ticket Status
            </h3>
            <p className="text-sm text-green-700 dark:text-green-300">
              You have {analytics.total} total tickets. {analytics.open} are
              open and being reviewed.
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderUsersSection = () => {
    if (usersLoading) {
      return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <p className="text-gray-500 dark:text-gray-400">Loading users...</p>
          </div>
        </div>
      );
    }

    if (!users || users.length === 0) {
      return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <p className="text-gray-500 dark:text-gray-400">No users found</p>
          </div>
        </div>
      );
    }

    return <UserRoleManagement users={users} onUserUpdate={handleUserUpdate} />;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                Welcome back, {user?.name}!
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Role: {user?.role} • {getRoleDescription(user?.role)}
              </p>
            </div>

            {(user?.role === "CUSTOMER" || user?.role === "ADMIN") && (
              <button
                onClick={handleCreateTicket}
                className="mt-4 sm:mt-0 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <span>+</span>
                Create New Ticket
              </button>
            )}
          </div>
        </div>

        <div className="mb-6 border-b border-gray-200 overflow-x-auto">
          <nav className="-mb-px flex space-x-4 sm:space-x-8 min-w-max">
            <button
              onClick={() => setActiveTab("tickets")}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === "tickets"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Tickets
            </button>

            {permissions.canViewAnalytics && (
              <button
                onClick={() => setActiveTab("analytics")}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === "analytics"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Analytics
              </button>
            )}

            {permissions.canManageUsers && (
              <button
                onClick={() => setActiveTab("users")}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === "users"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Users
              </button>
            )}
          </nav>
        </div>

        {activeTab === "tickets" && renderTicketsSection()}
        {activeTab === "analytics" && renderAnalyticsSection()}
        {activeTab === "users" && renderUsersSection()}
      </main>

      <CreateTicketModal
        isOpen={showCreateTicket}
        onClose={() => setShowCreateTicket(false)}
      />
    </div>
  );
};
