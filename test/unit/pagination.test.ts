import { offsetFor, toPaginated } from '../../src/common/pagination';

describe('offsetFor', () => {
  it('starts at zero on the first page', () => {
    expect(offsetFor({ page: 1, pageSize: 50 })).toBe(0);
  });

  it('skips whole pages', () => {
    expect(offsetFor({ page: 3, pageSize: 20 })).toBe(40);
  });
});

describe('toPaginated', () => {
  it('wraps data with paging metadata', () => {
    expect(toPaginated(['a', 'b'], 5, { page: 1, pageSize: 2 })).toEqual({
      data: ['a', 'b'],
      page: 1,
      pageSize: 2,
      total: 5,
      totalPages: 3,
    });
  });

  it('rounds the page count up', () => {
    expect(toPaginated([], 101, { page: 1, pageSize: 50 }).totalPages).toBe(3);
  });

  it('reports zero pages when there are no results', () => {
    expect(toPaginated([], 0, { page: 1, pageSize: 50 }).totalPages).toBe(0);
  });
});
