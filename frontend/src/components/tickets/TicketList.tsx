import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Filter, Download } from "lucide-react";

import { usePermissions } from "../../shared/hooks/usePermissions";
import { useTickets } from "../../shared/hooks/useTickets";
import { apiService } from "../../services/api";
import { TicketFilters } from "./TicketFilters";
import { TicketCard } from "./TicketCard";
import { Button } from "../ui/Button";
import { Loading } from "../ui/Loading";
import type { User } from "../../types";

interface TicketListProps {
  onTicketSelect: (ticketId: string) => void;
}

export const TicketList: React.FC<TicketListProps> = ({ onTicketSelect }) => {
  const permissions = usePermissions();
  const [agents, setAgents] = useState<User[]>([]);

  const [showFilters, setShowFilters] = useState(false);

  const {
    tickets,
    loading,
    error,
    filters,
    pagination,
    totalPages,
    total,
    updateFilters,
    updatePagination,
  } = useTickets();

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const users = await apiService.getUsers();
        setAgents(
          users.filter((u) => u.role === "AGENT" || u.role === "ADMIN")
        );
      } catch (error) {
        console.error("Failed to fetch agents:", error);
      }
    };

    fetchAgents();
  }, []);

  const handleClearFilters = () => {
    updateFilters({
      status: undefined,
      priority: undefined,
      assigneeId: undefined,
      search: undefined,
    });
  };

  const handlePageChange = (newPage: number) => {
    updatePagination({ page: newPage });
  };

  if (loading && tickets.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loading size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Support Tickets</h2>
          <p className="text-gray-600">
            {total} ticket{total !== 1 ? "s" : ""} found
            {permissions.isCustomer && " • Viewing your tickets"}
            {permissions.isAgent && " • Viewing assigned tickets"}
            {permissions.isAdmin && " • Viewing all tickets"}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2"
          >
            <Filter className="h-4 w-4" />
            {showFilters ? "Hide" : "Show"} Filters
          </Button>

          {permissions.canViewAllTickets && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {}}
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          )}
        </div>
      </div>

      {showFilters && (
        <TicketFilters
          filters={filters}
          onFiltersChange={updateFilters}
          agents={agents}
          onClearFilters={handleClearFilters}
        />
      )}

      {error && (
        <div className="bg-error-50 border border-error-200 rounded-lg p-4">
          <p className="text-error-800">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {tickets && tickets.length > 0 ? (
          tickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onClick={() => onTicketSelect(ticket.id)}
            />
          ))
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {loading
                ? "Loading tickets..."
                : "No tickets found matching your criteria."}
            </p>
          </div>
        )}
      </div>

      {tickets.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-gray-500">
            No tickets found matching your criteria.
          </p>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-700">
            Showing page {pagination.page} of {totalPages}
          </p>

          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
