import { configureStore, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import likesReducer from "./likes";
import profileReducer from "./profile";
import followReducer from "./follow";

// ===== Auth Slice =====
export interface AuthState {
  id: number | null;
  name: string;
  isLoggedIn: boolean;
  authChecked: boolean;
}

const authInitialState: AuthState = {
  id: null,
  name: "",
  isLoggedIn: false,
  authChecked: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState: authInitialState,
  reducers: {
    login: (state, action: PayloadAction<{ id: number; name: string }>) => {
      state.id = action.payload.id;
      state.name = action.payload.name;
      state.isLoggedIn = true;
      state.authChecked = true;
    },
    logout: (state) => {
      state.id = null;
      state.name = "";
      state.isLoggedIn = false;
      state.authChecked = true;
    },
    setAuthChecked: (state) => {
      state.authChecked = true;
    },

    // ✅ GLOBAL RESET ACTION
    resetAll: () => authInitialState,
  },
});

export const { login, logout, setAuthChecked, resetAll } = authSlice.actions;

// ===== Configure Store =====
export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    likes: likesReducer,
    profile: profileReducer,
    follow: followReducer,
  },
});

// types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
