import { config } from "../config";
import type {
  User,
  Ticket,
  Message,
  CreateTicketRequest,
  UpdateTicketRequest,
  CreateMessageRequest,
  TicketFilters,
  PaginationParams,
  PaginatedResponse,
  ApiError,
} from "../types";
import { withRateLimit } from "../utils/rateLimit";

const transformUser = (backendUser: any): User => ({
  id: backendUser._id,
  email: backendUser.email,
  name: backendUser.name,
  role: backendUser.role,
  createdAt: backendUser.createdAt,
});

const transformTicket = (backendTicket: any): Ticket => ({
  id: backendTicket._id,
  title: backendTicket.title,
  description: backendTicket.description,
  status: backendTicket.status,
  priority: backendTicket.priority,
  customerId: backendTicket.customer?._id || backendTicket.customer,
  assigneeId: backendTicket.assignee?._id || backendTicket.assignee,
  tags: backendTicket.tags || [],
  createdAt: backendTicket.createdAt,
  updatedAt: backendTicket.updatedAt,
  customer: {
    id: backendTicket.customer?._id || backendTicket.customer,
    email: backendTicket.customer?.email || "",
    name: backendTicket.customer?.name || "",
    role: backendTicket.customer?.role || "CUSTOMER",
    createdAt: backendTicket.customer?.createdAt || "",
  },
  assignee: backendTicket.assignee
    ? {
        id: backendTicket.assignee._id || backendTicket.assignee,
        email: backendTicket.assignee.email || "",
        name: backendTicket.assignee.name || "",
        role: backendTicket.assignee.role || "AGENT",
        createdAt: backendTicket.assignee.createdAt || "",
      }
    : undefined,
  messages: (backendTicket.messages || []).map(transformMessage),
});

const transformMessage = (backendMessage: any): Message => ({
  id: backendMessage._id,
  ticketId: backendMessage.ticket?._id || backendMessage.ticket,
  senderId: backendMessage.sender?._id || backendMessage.sender,
  content: backendMessage.content,
  createdAt: backendMessage.createdAt,
  sender: {
    id: backendMessage.sender?._id || backendMessage.sender,
    email: backendMessage.sender?.email || "",
    name: backendMessage.sender?.name || "",
    role: backendMessage.sender?.role || "CUSTOMER",
    createdAt: backendMessage.sender?.createdAt || "",
  },
  attachments:
    backendMessage.attachments?.map((attachment: any) => ({
      id: attachment._id || attachment.id,
      filename: attachment.filename,
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
      size: attachment.size,
      url: attachment.path || attachment.url,
      uploadedAt: attachment.uploadedAt,
    })) || [],
});

class ApiService {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    this.baseUrl = config.apiBaseUrl;
    this.token = localStorage.getItem("auth_token");
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem("auth_token", token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem("auth_token");
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (!(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        let errorMessage = "An unexpected error occurred";

        if (response.status === 429) {
          errorMessage =
            "Too many requests. Please wait a moment before trying again.";
        } else if (response.status === 401) {
          errorMessage =
            "Authentication failed. Please check your credentials.";
        } else if (response.status === 403) {
          errorMessage =
            "Access denied. You don't have permission to perform this action.";
        } else if (response.status === 404) {
          errorMessage = "Resource not found.";
        } else if (response.status >= 500) {
          errorMessage = "Server error. Please try again later.";
        }

        try {
          const error: ApiError = await response.json();
          if (error.message) {
            errorMessage = error.message;
          }
        } catch {
          throw new Error(errorMessage);
        }

        const error = new Error(errorMessage);
        (error as any).status = response.status;
        throw error;
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Network error occurred");
    }
  }

  private async requestWithRetry<T>(
    endpoint: string,
    options: RequestInit = {},
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.request<T>(endpoint, options);
      } catch (error) {
        lastError = error as Error;

        if (error instanceof Error && (error as any).status) {
          const status = (error as any).status;
          if (status === 401 || status === 403 || status === 404) {
            throw error;
          }
        }

        if (attempt === maxRetries) {
          throw error;
        }

        const delay = baseDelay * Math.pow(2, attempt);
        console.log(
          `Request failed, retrying in ${delay}ms... (attempt ${
            attempt + 1
          }/${maxRetries})`
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  async login(
    email: string,
    password: string
  ): Promise<{ token: string; user: User }> {
    return withRateLimit(
      `login:${email}`,
      async () => {
        const response = await this.requestWithRetry<{
          success: boolean;
          data: { token: string; user: any };
        }>("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });

        if (response.success && response.data) {
          return {
            token: response.data.token,
            user: transformUser(response.data.user),
          };
        } else {
          throw new Error("Invalid response format from server");
        }
      },
      (rateLimitInfo) => {
        console.log("Frontend rate limit hit:", rateLimitInfo.message);
      }
    );
  }

  async register(
    email: string,
    password: string,
    name: string
  ): Promise<{ token: string; user: User }> {
    const response = await this.request<{
      success: boolean;
      data: { token: string; user: any };
    }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    });

    if (response.success && response.data) {
      return {
        token: response.data.token,
        user: transformUser(response.data.user),
      };
    } else {
      throw new Error("Invalid response format from server");
    }
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.request<{
      success: boolean;
      data: { user: any };
    }>("/auth/me");

    if (response.success && response.data) {
      return transformUser(response.data.user);
    } else {
      throw new Error("Invalid response format from server");
    }
  }

  async getTickets(
    filters: TicketFilters = {},
    pagination: PaginationParams = { page: 1, limit: 10 }
  ): Promise<PaginatedResponse<Ticket>> {
    const params = new URLSearchParams();

    Object.entries({ ...filters, ...pagination }).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        if (Array.isArray(value)) {
          value.forEach((v) => params.append(key, v));
        } else {
          params.append(key, String(value));
        }
      }
    });

    const response = await this.request<{
      success: boolean;
      data: any[];
      pagination: any;
    }>(`/tickets?${params.toString()}`);

    if (response.success && response.data && response.pagination) {
      const transformedData = response.data.map((ticket: any) =>
        transformTicket(ticket)
      );

      return {
        data: transformedData,
        total: response.pagination.total,
        page: response.pagination.page,
        limit: response.pagination.limit,
        totalPages: response.pagination.totalPages,
      };
    } else {
      throw new Error("Invalid response format from server");
    }
  }

  async getTicket(id: string): Promise<Ticket> {
    const response = await this.request<{ success: boolean; data: any }>(
      `/tickets/${id}`
    );

    if (response.success && response.data) {
      return transformTicket(response.data);
    } else {
      throw new Error("Invalid response format from server");
    }
  }

  async createTicket(data: CreateTicketRequest): Promise<Ticket> {
    const response = await this.request<{ success: boolean; data: any }>(
      "/tickets",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );

    if (response.success && response.data) {
      return transformTicket(response.data);
    } else {
      throw new Error("Invalid response format from server");
    }
  }

  async updateTicket(id: string, data: UpdateTicketRequest): Promise<Ticket> {
    const response = await this.request<{ success: boolean; data: any }>(
      `/tickets/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    );

    if (response.success && response.data) {
      return transformTicket(response.data);
    } else {
      throw new Error("Invalid response format from server");
    }
  }

  async createMessage(
    ticketId: string,
    data: CreateMessageRequest
  ): Promise<Message> {
    if (data.attachments && data.attachments.length > 0) {
      const formData = new FormData();
      formData.append("content", data.content);

      data.attachments.forEach((file) => {
        formData.append("attachments", file);
      });

      const response = await this.request<{ success: boolean; data: any }>(
        `/messages/${ticketId}`,
        {
          method: "POST",
          body: formData,
          headers: {},
        }
      );

      if (response.success && response.data) {
        return transformMessage(response.data);
      } else {
        throw new Error("Invalid response format from server");
      }
    } else {
      const response = await this.request<{ success: boolean; data: any }>(
        `/messages/${ticketId}`,
        {
          method: "POST",
          body: JSON.stringify(data),
        }
      );

      if (response.success && response.data) {
        return transformMessage(response.data);
      } else {
        throw new Error("Invalid response format from server");
      }
    }
  }

  async getUsers(): Promise<User[]> {
    const response = await this.request<{ success: boolean; data: any[] }>(
      "/users"
    );

    if (response.success && response.data) {
      return response.data.map((user: any) => transformUser(user));
    } else {
      throw new Error("Invalid response format from server");
    }
  }

  async updateUserRole(userId: string, data: { role: string }): Promise<User> {
    const response = await this.request<{ success: boolean; data: any }>(
      `/users/${userId}/role`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      }
    );

    if (response.success && response.data) {
      return transformUser(response.data);
    } else {
      throw new Error("Invalid response format from server");
    }
  }
}

export const apiService = new ApiService();
