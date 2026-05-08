export type UserRole = "admin" | "manager" | "employee";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
}
