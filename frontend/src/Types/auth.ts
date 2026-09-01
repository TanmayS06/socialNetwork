export type RegisterForm = {
  full_name: string;
  username: string;
  email: string;
  password: string;
};

export type AuthResponse = {
  message: string;
  user?: {
    id: number;
    full_name: string;
    username: string;
    email: string;
  };
};


export type LoginForm = {
  identifier: string;
  password: string;
};

