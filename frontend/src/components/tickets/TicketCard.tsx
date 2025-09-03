import React from "react";
import { Clock, User, MessageSquare, Tag } from "lucide-react";
import { Badge } from "../ui/Badge";
import { formatDate } from "../../utils/formatters";
import type { Ticket } from "../../types";

interface TicketCardProps {
  ticket: Ticket;
  onClick: () => void;
  className?: string;
}

export const TicketCard: React.FC<TicketCardProps> = ({
  ticket,
  onClick,
  className = "",
}) => {
  if (!ticket || !ticket.customer) {
    console.error("Invalid ticket data:", ticket);
    return (
      <div className="card p-6 border-red-200 bg-red-50">
        <p className="text-red-600">Invalid ticket data</p>
      </div>
    );
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "OPEN":
        return "info";
      case "IN_PROGRESS":
        return "warning";
      case "RESOLVED":
        return "success";
      case "CLOSED":
        return "default";
      default:
        return "default";
    }
  };

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return "error";
      case "HIGH":
        return "warning";
      case "MEDIUM":
        return "info";
      case "LOW":
        return "default";
      default:
        return "default";
    }
  };

  return (
    <div
      className={`card p-2 xs:p-3 sm:p-4 md:p-6 hover:shadow-md transition-shadow cursor-pointer ${className}`}
      onClick={onClick}
    >
      <div className="flex flex-col space-y-2 mb-3">
        <h3 className="text-sm xs:text-base sm:text-lg font-semibold text-gray-900 dark:text-white line-clamp-2 leading-tight">
          {ticket.title}
        </h3>
        <div className="flex flex-wrap gap-1 xs:gap-2">
          <Badge variant={getStatusVariant(ticket.status)}>
            <span className="text-xs">{ticket.status.replace("_", " ")}</span>
          </Badge>
          <Badge variant={getPriorityVariant(ticket.priority)}>
            <span className="text-xs">{ticket.priority}</span>
          </Badge>
        </div>
      </div>

      <p className="text-gray-600 dark:text-gray-300 text-xs xs:text-sm mb-3 sm:mb-4 line-clamp-2 leading-relaxed">
        {ticket.description}
      </p>

      <div className="space-y-2 mb-3">
        <div className="flex items-center space-x-1 text-xs xs:text-sm text-gray-500 dark:text-gray-400">
          <User className="h-3 w-3 xs:h-4 xs:w-4 flex-shrink-0" />
          <span className="truncate min-w-0">
            {ticket.assignedBy
              ? `Assigned by: ${ticket.assignedBy.name}`
              : `Created by: ${ticket.customer?.name || "Unknown User"}`}
          </span>
        </div>

        {ticket.assignee ? (
          <div className="flex items-center space-x-1 text-xs xs:text-sm text-gray-500 dark:text-gray-400">
            <User className="h-3 w-3 xs:h-4 xs:w-4 flex-shrink-0" />
            <span className="truncate min-w-0">
              Assigned to: {ticket.assignee.name || "Unknown Agent"}
            </span>
          </div>
        ) : (
          <div className="flex items-center space-x-1 text-xs xs:text-sm text-gray-400 dark:text-gray-500">
            <User className="h-3 w-3 xs:h-4 xs:w-4 flex-shrink-0" />
            <span className="truncate min-w-0">Unassigned</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs xs:text-sm text-gray-500 dark:text-gray-400">
        <div className="flex items-center space-x-1">
          <MessageSquare className="h-3 w-3 xs:h-4 xs:w-4 flex-shrink-0" />
          <span>{ticket.messages?.length || 0}</span>
        </div>

        <div className="flex items-center space-x-1">
          <Clock className="h-3 w-3 xs:h-4 xs:w-4 flex-shrink-0" />
          <span className="truncate">{formatDate(ticket.createdAt)}</span>
        </div>
      </div>

      {ticket.tags && ticket.tags.length > 0 && (
        <div className="flex items-start space-x-2 mt-3">
          <Tag className="h-3 w-3 xs:h-4 xs:w-4 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5" />
          <div className="flex flex-wrap gap-1 min-w-0">
            {ticket.tags.map((tag) => (
              <Badge key={tag} variant="default" size="sm">
                <span className="text-xs">{tag}</span>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
