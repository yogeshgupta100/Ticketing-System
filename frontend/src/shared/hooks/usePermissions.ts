import { useAuth } from "../../context/AuthContext";

export const usePermissions = () => {
  const { user } = useAuth();

  return {
    canCreateTicket: user?.role === "CUSTOMER" || user?.role === "ADMIN",
    canEditTicket: user?.role === "AGENT" || user?.role === "ADMIN",
    canDeleteTicket: user?.role === "ADMIN",
    canAssignTicket: user?.role === "ADMIN",
    canChangeTicketStatus: user?.role === "AGENT" || user?.role === "ADMIN",

    canManageUsers: user?.role === "ADMIN",
    canViewAllTickets: user?.role === "ADMIN" || user?.role === "AGENT",
    canViewAnalytics: user?.role === "ADMIN" || user?.role === "AGENT",

    isCustomer: user?.role === "CUSTOMER",
    isAgent: user?.role === "AGENT",
    isAdmin: user?.role === "ADMIN",
  };
};
