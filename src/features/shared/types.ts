export type Page<T> = {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};
export type MemberSummary = {
  memberId: string;
  nickname: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
  isAdmin: boolean;
  createdAt: string;
};
