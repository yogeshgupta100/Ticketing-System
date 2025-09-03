import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TicketCard } from "./TicketCard";
import type { Ticket } from "../../types";

interface DraggableTicketCardProps {
  ticket: Ticket;
  onClick: () => void;
}

export const DraggableTicketCard: React.FC<DraggableTicketCardProps> = ({
  ticket,
  onClick,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ticket.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TicketCard
        ticket={ticket}
        onClick={onClick}
        className={isDragging ? "opacity-50" : ""}
      />
    </div>
  );
};
