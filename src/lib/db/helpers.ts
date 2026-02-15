import { asc, desc, type Column } from 'drizzle-orm';

import { nowISO } from './schema';

export { nowISO };

export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

export interface SortOptions {
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

interface QueryWithPagination {
  offset(n: number): QueryWithPagination;
  limit(n: number): QueryWithPagination;
}

interface QueryWithSort {
  orderBy(...cols: unknown[]): QueryWithSort;
}

export function applyPagination(
  query: QueryWithPagination,
  options: PaginationOptions
): QueryWithPagination {
  const { limit, offset } = options;

  let result = query;
  if (offset !== undefined) {
    result = result.offset(offset);
  }
  if (limit !== undefined) {
    result = result.limit(limit);
  }

  return result;
}

export function applySort(
  query: QueryWithSort,
  sortBy?: string,
  sortOrder: 'ASC' | 'DESC' = 'DESC',
  columnsMap?: Record<string, Column>
): QueryWithSort {
  if (!sortBy || !columnsMap) {
    return query;
  }

  const column = columnsMap[sortBy];
  if (!column) {
    return query;
  }

  const orderFn = sortOrder === 'DESC' ? desc : asc;
  return query.orderBy(orderFn(column));
}

export function buildSortOrderColumn(
  column: Column,
  sortOrder: 'ASC' | 'DESC'
): unknown {
  return sortOrder === 'DESC' ? desc(column) : asc(column);
}
