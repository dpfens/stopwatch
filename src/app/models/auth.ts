export interface User {
  id: number;
  username?: string;
  name: string;
}

export interface AuthStatus {
  authenticated: boolean;
  user?: User;
}