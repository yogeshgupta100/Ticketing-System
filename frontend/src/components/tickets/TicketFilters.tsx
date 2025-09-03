import React from "react";
import { Search, Filter } from "lucide-react";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";
import { useAuth } from "../../context/AuthContext";
import type { TicketFilters as TicketFiltersType, User } from "../../types";

interface TicketFiltersProps {
  filters: TicketFiltersType;
  onFiltersChange: (filters: Partial<TicketFiltersType>) => void;
  agents: User[];
  onClearFilters: () => void;
}

export const TicketFilters: React.FC<TicketFiltersProps> = ({
  filters,
  onFiltersChange,
  agents,
  onClearFilters,
}) => {
  const { user } = useAuth();

  const statusOptions = [
    { value: "", label: "All Statuses" },
    { value: "OPEN", label: "Open" },
    { value: "IN_PROGRESS", label: "In Progress" },
    { value: "RESOLVED", label: "Resolved" },
    { value: "CLOSED", label: "Closed" },
  ];

  const priorityOptions = [
    { value: "", label: "All Priorities" },
    { value: "LOW", label: "Low" },
    { value: "MEDIUM", label: "Medium" },
    { value: "HIGH", label: "High" },
    { value: "URGENT", label: "Urgent" },
  ];

  const assigneeOptions = [
    { value: "", label: "All Assignees" },
    { value: "null", label: "Unassigned" },
    ...agents.map((agent) => ({ value: agent.id, label: agent.name })),
  ];

  const canFilterByAssignee = user?.role === "AGENT" || user?.role === "ADMIN";
  const canFilterByCustomer = user?.role === "ADMIN";
  const canFilterByTags =
    user?.role === "CUSTOMER" ||
    user?.role === "AGENT" ||
    user?.role === "ADMIN";

  return (
    <div className="card p-6 mb-6">
      <div className="flex items-center space-x-2 mb-4">
        <Filter className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Filters
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search tickets..."
            value={filters.search || ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onFiltersChange({ search: e.target.value })
            }
            className="pl-10"
          />
        </div>

        <Select
          options={statusOptions}
          value={filters.status || ""}
          onChange={(value: string) =>
            onFiltersChange({ status: value as any })
          }
        />

        <Select
          options={priorityOptions}
          value={filters.priority || ""}
          onChange={(value: string) =>
            onFiltersChange({ priority: value as any })
          }
        />

        {canFilterByAssignee && (
          <Select
            options={assigneeOptions}
            value={filters.assigneeId || ""}
            onChange={(value: string) => onFiltersChange({ assigneeId: value })}
          />
        )}

        {canFilterByCustomer && (
          <Select
            options={[{ value: "", label: "All Customers" }]}
            value={filters.customerId || ""}
            onChange={(value: string) => onFiltersChange({ customerId: value })}
          />
        )}

        {canFilterByTags && (
          <Input
            placeholder="Tags (comma separated)"
            value={filters.tags?.join(", ") || ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const tags = e.target.value
                .split(",")
                .map((tag: string) => tag.trim())
                .filter((tag: string) => tag.length > 0);
              onFiltersChange({ tags: tags.length > 0 ? tags : undefined });
            }}
          />
        )}
      </div>

      <div className="mt-4 flex justify-end">
        <Button variant="outline" size="sm" onClick={onClearFilters}>
          Clear Filters
        </Button>
      </div>
    </div>
  );
};
