import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import type { RegisterForm } from "@/Types/auth";
import { registerUser } from "@/services/authService";
import { Activity } from "lucide-react";
import { toast } from "sonner";

const Register = () => {
  const [form, setForm] = useState<RegisterForm>({
    full_name: "",
    username: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({
      ...form,
      [e.target.id]: e.target.value,
    });
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const user = await registerUser(form);
      console.log("SUCCESS:", user.message);
      navigate("/login", {
        state: {
          fromRegister: true,
          message: "Account created successfully! Please log in.",
        },
      });
    } catch (err: any) {
      console.error("REGISTER ERROR:", err.response?.data || err.message);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Registration failed. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

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
              Create an account and start connecting in real-time
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name" className="text-xs font-medium text-zinc-300">
                Full Name
              </Label>
              <Input
                id="full_name"
                name="full_name"
                type="text"
                placeholder="Alex Morgan"
                value={form.full_name}
                onChange={handleChange}
                required
                className="border-zinc-800 bg-zinc-950/60 focus-visible:ring-violet-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username" className="text-xs font-medium text-zinc-300">
                Username
              </Label>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="alexmorgan"
                value={form.username}
                onChange={handleChange}
                required
                className="border-zinc-800 bg-zinc-950/60 focus-visible:ring-violet-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-medium text-zinc-300">
                Email Address
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="alex@example.com"
                value={form.email}
                onChange={handleChange}
                required
                className="border-zinc-800 bg-zinc-950/60 focus-visible:ring-violet-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-medium text-zinc-300">
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                required
                className="border-zinc-800 bg-zinc-950/60 focus-visible:ring-violet-500"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 py-2.5 font-semibold text-white shadow-md shadow-violet-500/20 hover:from-violet-500 hover:to-indigo-500 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Join Pulse"}
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-zinc-400">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-violet-400 hover:underline">
              Log in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;