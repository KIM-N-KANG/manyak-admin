export type CursorPage<T> = { items: T[]; nextCursor: string | null };
export type MemberSummary = {
  memberId: string;
  nickname: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
  isAdmin: boolean;
  createdAt: string;
};
