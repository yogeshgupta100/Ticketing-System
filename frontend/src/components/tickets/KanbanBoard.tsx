import React, { useState, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { TicketCard } from "./TicketCard";
import { DraggableTicketCard } from "./DraggableTicketCard";
import { wsService } from "../../services/websocket";
import type { Ticket, WebSocketMessage } from "../../types";

interface KanbanBoardProps {
  tickets: Ticket[];
  onTicketSelect?: (ticketId: string) => void;
  onTicketStatusChange?: (ticketId: string, newStatus: string) => void;
  onTicketUpdate?: (ticketId: string, updates: Partial<Ticket>) => void;
  onCreateTicket?: () => void;
  userRole?: string;
  canEditTickets?: boolean;
  canChangeStatus?: boolean;
}

const statusColumns = [
  { key: "OPEN", label: "To Do", color: "bg-gray-50 dark:bg-gray-800" },
  {
    key: "IN_PROGRESS",
    label: "In Progress",
    color: "bg-blue-50 dark:bg-blue-900/20",
  },
  {
    key: "RESOLVED",
    label: "Resolved",
    color: "bg-green-50 dark:bg-green-900/20",
  },
  { key: "CLOSED", label: "Closed", color: "bg-gray-100 dark:bg-gray-700" },
];

const DroppableColumn: React.FC<{
  column: (typeof statusColumns)[0];
  tickets: Ticket[];
  onTicketSelect: (ticketId: string) => void;
}> = ({ column, tickets, onTicketSelect }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: column.key,
  });

  const columnTickets = tickets.filter(
    (ticket) => ticket.status === column.key
  );

  return (
    <div
      ref={setNodeRef}
      className={`${
        column.color
      } rounded-lg p-3 sm:p-4 min-h-[150px] sm:min-h-[200px] border-2 border-dashed transition-colors ${
        isOver
          ? "border-blue-400 dark:border-blue-500 bg-blue-100 dark:bg-blue-900/30 shadow-lg"
          : "border-transparent hover:border-gray-300 dark:hover:border-gray-600"
      }`}
      data-status={column.key}
      title={`Drop tickets here to move them to ${column.label}`}
    >
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h3 className="text-xs xs:text-sm sm:text-base font-semibold text-gray-900 dark:text-white truncate flex-1 mr-2">
          {column.label}
        </h3>
        <div className="flex items-center space-x-2 flex-shrink-0">
          <span className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs px-2 py-1 rounded-full">
            {columnTickets.length}
          </span>
          <button className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 p-1">
            <span className="text-base xs:text-lg sm:text-xl">+</span>
          </button>
        </div>
      </div>

      <div className="min-h-[80px] sm:min-h-[100px] flex-1 space-y-2 sm:space-y-3">
        {columnTickets.map((ticket) => (
          <DraggableTicketCard
            key={ticket.id}
            ticket={ticket}
            onClick={() => onTicketSelect(ticket.id)}
          />
        ))}
        {columnTickets.length === 0 && (
          <div className="text-center text-gray-400 dark:text-gray-500 py-4 sm:py-6 md:py-8">
            {isOver ? (
              <div className="text-blue-600 dark:text-blue-400 font-medium text-xs xs:text-sm sm:text-base">
                Drop here to move ticket
              </div>
            ) : (
              <span className="text-xs xs:text-sm sm:text-base">
                No tickets
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tickets,
  onTicketSelect,
  onTicketStatusChange,
  onTicketUpdate,
  onCreateTicket,
  userRole,
  canEditTickets = false,
  canChangeStatus = false,
}) => {
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);

  useEffect(() => {
    const ticketSubscription = wsService.subscribeToAllTickets(
      (message: WebSocketMessage) => {
        if (
          message.type === "TICKET_UPDATED" ||
          message.type === "TICKET_CREATED"
        ) {
          window.location.reload();
        }
      }
    );

    return () => {
      wsService.unsubscribe(ticketSubscription);
    };
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const ticket = tickets.find((t) => t.id === event.active.id);
    if (ticket) {
      setActiveTicket(ticket);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const ticketId = active.id as string;
      const newStatus = over.id as string;

      const validColumn = statusColumns.find((col) => col.key === newStatus);
      if (validColumn) {
        onTicketStatusChange?.(ticketId, newStatus);
      } else {
      }
    } else {
    }

    setActiveTicket(null);
  };

  return (
    <DndContext
      sensors={canChangeStatus ? sensors : []}
      onDragStart={canChangeStatus ? handleDragStart : undefined}
      onDragEnd={canChangeStatus ? handleDragEnd : undefined}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Tickets
            </h2>
            {userRole && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {userRole === "ADMIN" &&
                  "Viewing all tickets - Can assign to agents"}
                {userRole === "AGENT" &&
                  "Viewing assigned and unassigned tickets"}
                {userRole === "CUSTOMER" && "Viewing your own tickets"}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2"></div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {statusColumns.map((column) => (
            <DroppableColumn
              key={column.key}
              column={column}
              tickets={tickets}
              onTicketSelect={onTicketSelect || (() => {})}
            />
          ))}
        </div>
      </div>

      <DragOverlay>
        {activeTicket ? (
          <TicketCard
            ticket={activeTicket}
            onClick={() => {}}
            className="opacity-80 rotate-3 scale-105"
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
