export interface PageRequest {
  page: number;
  pageSize: number;
}

export interface Paginated<T> extends PageRequest {
  data: T[];
  total: number;
  totalPages: number;
}

export function offsetFor({ page, pageSize }: PageRequest): number {
  return (page - 1) * pageSize;
}

export function toPaginated<T>(data: T[], total: number, request: PageRequest): Paginated<T> {
  return {
    data,
    page: request.page,
    pageSize: request.pageSize,
    total,
    totalPages: Math.ceil(total / request.pageSize),
  };
}
