export interface AuthContext {
  userId: string;
  email: string;
  role: 'ADMIN' | 'MEMBER';
  isAdmin: boolean;
  isSuperAdmin: boolean;
  status: 'ACTIVE' | 'PENDING';
  groupIds: string[];
  groupSlugs: string[];
}
