import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { Ticket, TicketFilters, PaginationParams } from "../../types";

interface TicketsState {
  tickets: Ticket[];
  selectedTicket: Ticket | null;
  filters: TicketFilters;
  pagination: PaginationParams;
  loading: boolean;
  error: string | null;
  total: number;
  totalPages: number;
}

const initialState: TicketsState = {
  tickets: [],
  selectedTicket: null,
  filters: {},
  pagination: { page: 1, limit: 10 },
  loading: false,
  error: null,
  total: 0,
  totalPages: 0,
};

const ticketsSlice = createSlice({
  name: "tickets",
  initialState,
  reducers: {
    setTickets: (state, action: PayloadAction<Ticket[]>) => {
      state.tickets = action.payload;
    },
    addTicket: (state, action: PayloadAction<Ticket>) => {
      state.tickets.unshift(action.payload);
      state.total += 1;
    },
    updateTicket: (
      state,
      action: PayloadAction<Partial<Ticket> & { id: string }>
    ) => {
      const index = state.tickets.findIndex((t) => t.id === action.payload.id);
      if (index !== -1) {
        state.tickets[index] = { ...state.tickets[index], ...action.payload };
      }
    },
    removeTicket: (state, action: PayloadAction<string>) => {
      state.tickets = state.tickets.filter((t) => t.id !== action.payload);
      state.total = Math.max(0, state.total - 1);
    },
    setSelectedTicket: (state, action: PayloadAction<Ticket | null>) => {
      state.selectedTicket = action.payload;
    },
    setFilters: (state, action: PayloadAction<TicketFilters>) => {
      state.filters = { ...state.filters, ...action.payload };
      state.pagination.page = 1;
    },
    setPagination: (state, action: PayloadAction<PaginationParams>) => {
      state.pagination = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setTotal: (state, action: PayloadAction<number>) => {
      state.total = action.payload;
      state.totalPages = Math.ceil(action.payload / state.pagination.limit);
    },
    clearFilters: (state) => {
      state.filters = {};
      state.pagination.page = 1;
    },
  },
});

export const {
  setTickets,
  addTicket,
  updateTicket,
  removeTicket,
  setSelectedTicket,
  setFilters,
  setPagination,
  setLoading,
  setError,
  setTotal,
  clearFilters,
} = ticketsSlice.actions;

export default ticketsSlice.reducer;
