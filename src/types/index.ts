export type UserType = "farmer" | "buyer" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  type: UserType;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
