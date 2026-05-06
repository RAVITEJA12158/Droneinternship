import { PaginatedResponse } from "../types";

export function paginate(page: number, limit: number) {
  return {
    skip: (page - 1) * limit,
    take: limit,
  };
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResponse<T> {
  return {
    data,
    total,
    page,
    limit,
    hasMore: page * limit < total,
  };
}

export function parsePagination(query: Record<string, unknown>): {
  page: number;
  limit: number;
} {
  const page = Math.max(1, parseInt(String(query.page || "1"), 10));
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit || "30"), 10)));
  return { page, limit };
}
