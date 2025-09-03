import React, { useState, useEffect } from "react";
import { ArrowLeft, Edit3, Save, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTicket } from "../../shared/hooks/useTicket";
import { apiService } from "../../services/api";
import { useToast } from "../ui/ToastContainer";
import { Button } from "../ui/Button";
import { Select } from "../ui/Select";
import { Badge } from "../ui/Badge";
import { Loading } from "../ui/Loading";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { formatDateTime } from "../../utils/formatters";
import { wsService } from "../../services/websocket";
import type { User, UpdateTicketRequest, WebSocketMessage } from "../../types";

interface TicketDetailProps {
  ticketId: string;
  onBack: () => void;
}

export const TicketDetail: React.FC<TicketDetailProps> = ({
  ticketId,
  onBack,
}) => {
  const { user } = useAuth();
  const {
    ticket: originalTicket,
    loading,
    error,
    sendMessage,
    updateTicket,
    updating,
  } = useTicket(ticketId);
  const [ticket, setTicket] = useState(originalTicket);
  const [agents, setAgents] = useState<User[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<UpdateTicketRequest>({});
  const { showToast } = useToast();

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

  useEffect(() => {
    if (originalTicket) {
      setTicket(originalTicket);
      setEditData({
        status: originalTicket.status,
        priority: originalTicket.priority,
        assigneeId: originalTicket.assigneeId || "",
        tags: originalTicket.tags,
      });
    }
  }, [originalTicket]);

  useEffect(() => {
    if (!ticket) return;

    const ticketSubscription = wsService.subscribeToTicketUpdates(
      ticket.id,
      (message: WebSocketMessage) => {
        if (message.type === "MESSAGE_CREATED") {
          if (message.payload && message.payload.message) {
            const newMessage = message.payload.message;

            setTicket((prevTicket) => {
              if (prevTicket && prevTicket.messages) {
                return {
                  ...prevTicket,
                  messages: [...prevTicket.messages, newMessage],
                };
              }
              return prevTicket;
            });
          }
        } else if (message.type === "TICKET_UPDATED") {
          if (message.payload && message.payload.data) {
            const updates = message.payload.data;
            setTicket((prevTicket) => {
              if (prevTicket) {
                return {
                  ...prevTicket,
                  ...updates,
                  updatedAt: new Date().toISOString(),
                };
              }
              return prevTicket;
            });
          }
        }
      }
    );

    return () => {
      wsService.unsubscribe(ticketSubscription);
    };
  }, [ticket?.id]);

  const canEdit =
    user?.role === "AGENT" ||
    user?.role === "ADMIN" ||
    (user?.role === "CUSTOMER" && ticket?.customerId === user.id);

  const handleSaveChanges = async () => {
    if (!ticket) return;

    try {
      await updateTicket(editData);
      setIsEditing(false);
      showToast("Ticket updated successfully!", "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Failed to update ticket",
        "error"
      );
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (ticket) {
      setEditData({
        status: ticket.status,
        priority: ticket.priority,
        assigneeId: ticket.assigneeId || "",
        tags: ticket.tags,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loading size="lg" />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error || "Ticket not found"}</p>
        <Button onClick={onBack} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tickets
        </Button>
      </div>
    );
  }

  const statusOptions = [
    { value: "OPEN", label: "Open" },
    { value: "IN_PROGRESS", label: "In Progress" },
    { value: "RESOLVED", label: "Resolved" },
    { value: "CLOSED", label: "Closed" },
  ];

  const priorityOptions = [
    { value: "LOW", label: "Low" },
    { value: "MEDIUM", label: "Medium" },
    { value: "HIGH", label: "High" },
    { value: "URGENT", label: "Urgent" },
  ];

  const getAssigneeOptions = () => {
    if (user?.role === "CUSTOMER") {
      return [
        { value: "", label: "Unassigned" },
        { value: user.id, label: `${user.name} (You)` },
      ];
    } else if (user?.role === "AGENT") {
      return [
        { value: "", label: "Unassigned" },
        { value: user.id, label: `${user.name} (You)` },
      ];
    } else {
      return [
        { value: "", label: "Unassigned" },
        ...agents.map((agent) => ({ value: agent.id, label: agent.name })),
      ];
    }
  };

  const assigneeOptions = getAssigneeOptions();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={onBack}
          className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tickets
        </Button>

        {canEdit && (
          <div className="flex space-x-2">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEdit}
                  disabled={updating}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveChanges}
                  loading={updating}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {ticket.title}
            </h1>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {ticket.description}
            </p>
          </div>

          <MessageList messages={ticket.messages} />
          <MessageInput onSendMessage={sendMessage} />
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Ticket Details
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Status
                </label>
                {isEditing ? (
                  <Select
                    options={statusOptions}
                    value={editData.status || ""}
                    onChange={(value) =>
                      setEditData((prev) => ({
                        ...prev,
                        status: value as any,
                      }))
                    }
                    className="mt-1"
                  />
                ) : (
                  <div className="mt-1">
                    <Badge
                      variant={
                        ticket.status === "RESOLVED" ? "success" : "info"
                      }
                    >
                      {ticket.status.replace("_", " ")}
                    </Badge>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Priority
                </label>
                {isEditing ? (
                  <Select
                    options={priorityOptions}
                    value={editData.priority || ""}
                    onChange={(value) =>
                      setEditData((prev) => ({
                        ...prev,
                        priority: value as any,
                      }))
                    }
                    className="mt-1"
                  />
                ) : (
                  <div className="mt-1">
                    <Badge
                      variant={
                        ticket.priority === "URGENT" ? "error" : "warning"
                      }
                    >
                      {ticket.priority}
                    </Badge>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Assigned By
                </label>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">
                  {ticket.assignedBy
                    ? ticket.assignedBy.name
                    : ticket.customer.name}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Assigned To
                </label>
                {isEditing && user?.role === "ADMIN" ? (
                  <Select
                    options={assigneeOptions}
                    value={editData.assigneeId || ""}
                    onChange={(value) =>
                      setEditData((prev) => ({
                        ...prev,
                        assigneeId: value,
                      }))
                    }
                    className="mt-1"
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-900">
                    {ticket.assignee ? ticket.assignee.name : "Unassigned"}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">
                  Created
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {formatDateTime(ticket.createdAt)}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">
                  Last Updated
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {formatDateTime(ticket.updatedAt)}
                </p>
              </div>

              {ticket.tags.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Tags
                  </label>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {ticket.tags.map((tag) => (
                      <Badge key={tag} variant="default" size="sm">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
