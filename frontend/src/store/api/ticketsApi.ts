import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
  Ticket,
  CreateTicketRequest,
  UpdateTicketRequest,
  TicketFilters,
  PaginatedResponse,
} from "../../types";

export const ticketsApi = createApi({
  reducerPath: "ticketsApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "http://localhost:8080/api",
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as any).auth.token;
      if (token) {
        headers.set("authorization", `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ["Ticket", "Tickets"],
  endpoints: (builder) => ({
    getTickets: builder.query<
      PaginatedResponse<Ticket>,
      TicketFilters & { page?: number; limit?: number }
    >({
      query: (params) => ({
        url: "/tickets",
        params,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: "Ticket" as const, id })),
              { type: "Tickets", id: "LIST" },
            ]
          : [{ type: "Tickets", id: "LIST" }],
      transformResponse: (response: any) => ({
        data: response.data || [],
        total: response.total || 0,
        page: response.page || 1,
        limit: response.limit || 10,
        totalPages: response.totalPages || 1,
      }),
    }),

    getTicket: builder.query<Ticket, string>({
      query: (id) => `/tickets/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Ticket", id }],
    }),

    createTicket: builder.mutation<Ticket, CreateTicketRequest>({
      query: (ticket) => ({
        url: "/tickets",
        method: "POST",
        body: ticket,
      }),
      invalidatesTags: [{ type: "Tickets", id: "LIST" }],
    }),

    updateTicket: builder.mutation<
      Ticket,
      { id: string; updates: UpdateTicketRequest }
    >({
      query: ({ id, updates }) => ({
        url: `/tickets/${id}`,
        method: "PUT",
        body: updates,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Ticket", id },
        { type: "Tickets", id: "LIST" },
      ],
    }),

    deleteTicket: builder.mutation<void, string>({
      query: (id) => ({
        url: `/tickets/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Tickets", id: "LIST" }],
    }),

    assignTicket: builder.mutation<
      Ticket,
      { id: string; assigneeId: string; assignedById: string }
    >({
      query: ({ id, assigneeId, assignedById }) => ({
        url: `/tickets/${id}`,
        method: "PUT",
        body: { assigneeId, assignedById },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Ticket", id },
        { type: "Tickets", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetTicketsQuery,
  useGetTicketQuery,
  useCreateTicketMutation,
  useUpdateTicketMutation,
  useDeleteTicketMutation,
  useAssignTicketMutation,
} = ticketsApi;
