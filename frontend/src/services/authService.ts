import api from "@/lib/api";
import type { RegisterForm, AuthResponse, LoginForm } from "@/Types/auth";

export const registerUser = async (payload: RegisterForm) : Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>("/register", payload);
    return response.data;
}

export const loginUser = async (payload: LoginForm) : Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>("/login", payload);
    return response.data;
};

