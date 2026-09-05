import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import type { LoginForm } from "@/Types/auth";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "@/store/types";
import api from "@/lib/api";
import { login } from "@/store";
import { fetchProfile } from "@/store/profile";
import { toast } from "sonner";
import { Activity } from "lucide-react";

export function Login() {
  const [form, setForm] = useState<LoginForm>({
    identifier: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  const shownRef = useRef(false);

  useEffect(() => {
    if (shownRef.current) return;

    const st = location.state as
      | { fromRegister?: boolean; message?: string }
      | null;

    if (st?.fromRegister && st?.message) {
      shownRef.current = true;
      toast.success(st.message);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post("/login", form, { withCredentials: true });
      const profile = await dispatch(fetchProfile()).unwrap();
      dispatch(login({ id: profile.id, name: profile.username }));
      toast.success("Welcome back to Pulse!");
      navigate("/", { replace: true });
    } catch (err: any) {
      console.error(err);
      const msg = err?.response?.data?.message ?? "Invalid username/email or password";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-12">
      <Card className="w-full max-w-md border-zinc-800 bg-zinc-900/60 backdrop-blur-xl shadow-2xl">
        <CardHeader className="space-y-3 pb-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-500 shadow-lg shadow-violet-500/25">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-violet-400 via-purple-300 to-indigo-300 bg-clip-text text-transparent">
              pulse
            </h1>
            <CardDescription className="mt-1 text-sm text-zinc-400">
              Welcome back! Log in to join the conversation
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier" className="text-xs font-medium text-zinc-300">
                Username or Email
              </Label>
              <Input
                id="identifier"
                name="identifier"
                value={form.identifier}
                onChange={handleChange}
                placeholder="alex or alex@example.com"
                required
                autoComplete="identifier"
                className="border-zinc-800 bg-zinc-950/60 focus-visible:ring-violet-500"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-medium text-zinc-300">
                  Password
                </Label>
                <Link
                  to="/register"
                  className="text-xs text-zinc-400 hover:text-violet-400 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="border-zinc-800 bg-zinc-950/60 focus-visible:ring-violet-500"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 py-2.5 font-semibold text-white shadow-md shadow-violet-500/20 hover:from-violet-500 hover:to-indigo-500 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-zinc-400">
            Don't have an account?{" "}
            <Link to="/register" className="font-medium text-violet-400 hover:underline">
              Create an account
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}