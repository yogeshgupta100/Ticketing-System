export interface User {
  id: string;
  email: string;
  name: string;
  role: "CUSTOMER" | "AGENT" | "ADMIN";
  createdAt: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  customerId: string;
  assigneeId?: string;
  assignedById?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  customer: User;
  assignee?: User;
  assignedBy?: User;
  messages: Message[];
}

export interface Message {
  id: string;
  ticketId: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender: User;
  attachments?: FileAttachment[];
}

export interface FileAttachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedAt: string;
}

export interface CreateTicketRequest {
  title: string;
  description: string;
  priority: Ticket["priority"];
  category?: string;
  tags: string[];
  assigneeId?: string;
}

export interface UpdateTicketRequest {
  status?: Ticket["status"];
  priority?: Ticket["priority"];
  assigneeId?: string;
  assignedById?: string;
  tags?: string[];
}

export interface CreateMessageRequest {
  content: string;
  attachments?: File[];
}

export interface TicketFilters {
  status?: Ticket["status"];
  priority?: Ticket["priority"];
  assigneeId?: string;
  customerId?: string;
  tags?: string[];
  search?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

export interface WebSocketMessage {
  type:
    | "TICKET_CREATED"
    | "TICKET_UPDATED"
    | "MESSAGE_CREATED"
    | "USER_UPDATED";
  payload: any;
}
