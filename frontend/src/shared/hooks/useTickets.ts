import { useState, useEffect, useCallback, useRef } from "react";
import { apiService } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import type { Ticket, TicketFilters, PaginationParams } from "../../types";

export const useTickets = (initialFilters: TicketFilters = {}) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<TicketFilters>(initialFilters);
  const [pagination, setPagination] = useState<PaginationParams>({
    page: 1,
    limit: 20,
  });
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const { user } = useAuth();

  const filtersRef = useRef<TicketFilters>(initialFilters);
  const paginationRef = useRef<PaginationParams>(pagination);
  const isInitialMount = useRef(true);

  const hasFiltersChanged =
    JSON.stringify(filters) !== JSON.stringify(filtersRef.current);
  const hasPaginationChanged =
    JSON.stringify(pagination) !== JSON.stringify(paginationRef.current);

  const getRoleBasedFilters = useCallback(
    (baseFilters: TicketFilters): TicketFilters => {
      if (!user) return baseFilters;

      const roleFilters = { ...baseFilters };

      switch (user.role) {
        case "CUSTOMER":
          roleFilters.customerId = user.id;
          break;
        case "AGENT":
          if (!roleFilters.assigneeId) {
            roleFilters.assigneeId = user.id;
          }
          break;
        case "ADMIN":
          break;
        default:
          break;
      }

      return roleFilters;
    },
    [user]
  );

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setLoading(true);
        setError(null);

        const roleFilters = getRoleBasedFilters(filters);

        const response = await apiService.getTickets(roleFilters, pagination);
        setTickets(response.data);
        setTotal(response.total);
        setTotalPages(response.totalPages);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch tickets"
        );
      } finally {
        setLoading(false);
      }
    };

    if (isInitialMount.current || hasFiltersChanged || hasPaginationChanged) {
      fetchTickets();
      isInitialMount.current = false;
    }

    filtersRef.current = filters;
    paginationRef.current = pagination;
  }, [
    filters,
    pagination,
    hasFiltersChanged,
    hasPaginationChanged,
    getRoleBasedFilters,
  ]);

  const updateTicketStatusOptimistically = useCallback(
    (ticketId: string, newStatus: string) => {
      setTickets((prev) =>
        prev.map((ticket) =>
          ticket.id === ticketId
            ? { ...ticket, status: newStatus as any }
            : ticket
        )
      );
    },
    []
  );

  const updateFilters = useCallback((newFilters: Partial<TicketFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  const updatePagination = useCallback(
    (newPagination: Partial<PaginationParams>) => {
      setPagination((prev) => ({ ...prev, ...newPagination }));
    },
    []
  );

  const refreshTickets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const roleFilters = getRoleBasedFilters(filters);

      const response = await apiService.getTickets(roleFilters, pagination);
      setTickets(response.data);
      setTotal(response.total);
      setTotalPages(response.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch tickets");
    } finally {
      setLoading(false);
    }
  }, [filters, pagination, getRoleBasedFilters]);

  const getAvailableFilterOptions = useCallback(() => {
    if (!user) return {};

    switch (user.role) {
      case "CUSTOMER":
        return {
          status: true,
          priority: true,
          tags: true,
          search: true,
        };
      case "AGENT":
        return {
          status: true,
          priority: true,
          tags: true,
          search: true,
          assigneeId: true,
          customerId: true,
        };
      case "ADMIN":
        return {
          status: true,
          priority: true,
          tags: true,
          search: true,
          assigneeId: true,
          customerId: true,
        };
      default:
        return {};
    }
  }, [user]);

  return {
    tickets,
    loading,
    error,
    filters,
    pagination,
    total,
    totalPages,
    updateTicketStatusOptimistically,
    updateFilters,
    updatePagination,
    refreshTickets,
    getAvailableFilterOptions,
    userRole: user?.role,
  };
};
