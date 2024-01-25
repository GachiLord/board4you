export interface Paginated<T> {
  content: T[],
  current_page: number,
  max_page: number,
}

export const PaginatedDefault: Paginated<any> = {
  content: [],
  current_page: 1,
  max_page: 1
}

export interface PaginationProps<T> {
  contents: T[],
  currentPage: number,
  maxPage: number,
  onPrev: () => void,
  onNext: () => void,
  onIndex: (pageIndex: number) => void
}

