import { Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "./store/types";
import { login, logout, setAuthChecked } from "./store";
import { fetchProfile } from "./store/profile";

import { Login } from "./pages/Login";
import Register from "./pages/Register";
import ProtectedRoute from "./components/ProtectedRoute";
import GuestRoute from "./components/GuestRoute";
import Home from "./pages/Home";
import ThreadDetailPage from "./pages/ThreadDetailPage";
import AppLayout from "./components/layouts/AppLayout";
import FollowPage from "./pages/FollowPage";
import SearchPage from "./pages/SearchPage";
import MyProfilePage from "./pages/MyProfilePage";

import { Toaster } from "sonner";
import UserProfilePage from "./pages/UserProfilePage";
import UserFollowPage from "./pages/UserFollowPage";

function App() {
  const dispatch = useDispatch<AppDispatch>();
  const location = useLocation();

  useEffect(() => {
    dispatch(fetchProfile())
      .unwrap()
      .then((profile) => {
        dispatch(
          login({
            id: Number(profile.id),
            name: profile.username,
          })
        );
      })
      .catch(() => dispatch(logout()))
      .finally(() => dispatch(setAuthChecked()));
  }, [dispatch]);

    const isAuthPage =
    location.pathname === "/login" || location.pathname === "/register";


  return (
    <>
      <Toaster
        position={isAuthPage ? "top-center" : "bottom-right"}
        richColors
        closeButton
        duration={2500}
        offset={isAuthPage ? 110 : 16} 
      />
      <Routes>
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/thread/:id" element={<ThreadDetailPage />} />
            <Route path="/follow" element={<FollowPage />} />
            <Route path="/follows" element={<FollowPage />} />
            <Route path="/u/:username/follow" element={<UserFollowPage />} />
            <Route path="/u/:username/follows" element={<UserFollowPage />} />
            <Route path="/profile" element={<MyProfilePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/u/:username" element={<UserProfilePage />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}

export default App;
