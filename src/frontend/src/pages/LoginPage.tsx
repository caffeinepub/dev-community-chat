import { useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2, MessageCircle } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { backendService as backend } from "../services/backendService";

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    try {
      const token = await backend.login(username.trim(), password);
      localStorage.setItem("sessionToken", token);
      localStorage.setItem("currentUsername", username.trim());
      if (
        typeof Notification !== "undefined" &&
        Notification.permission === "default"
      ) {
        Notification.requestPermission();
      }
      navigate({ to: "/chat" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(
        msg.includes("Invalid")
          ? "Invalid username or password."
          : "Login failed. Please try again.",
      );
      toast.error("Login failed");
    } finally {
      setLoading(false);
    }
  };

  const inputBase =
    "w-full px-4 py-2.5 rounded-xl text-sm text-white outline-none transition-all";
  const inputStyle = {
    background: "#0D1F27",
    border: "1px solid #2A3F4A",
    color: "white" as const,
  };
  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "#25D366";
    e.target.style.boxShadow = "0 0 0 2px rgba(37,211,102,0.15)";
  };
  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "#2A3F4A";
    e.target.style.boxShadow = "none";
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        background:
          "linear-gradient(135deg, #0B141A 0%, #111B21 50%, #1A2A31 100%)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md mx-4"
      >
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "#25D366" }}
          >
            <MessageCircle className="w-9 h-9 text-white" strokeWidth={1.75} />
          </div>
          <h1 className="text-2xl font-bold text-white">DevCommunity</h1>
          <p className="text-sm mt-1" style={{ color: "#8B9EA8" }}>
            Connect with developers worldwide
          </p>
        </div>

        <div
          className="rounded-2xl p-8"
          style={{ background: "#1A2A31", border: "1px solid #2A3F4A" }}
        >
          <h2 className="text-xl font-semibold text-white mb-6">
            Welcome back
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="login-username"
                className="block text-xs font-medium mb-1.5"
                style={{ color: "#8B9EA8" }}
              >
                USERNAME OR EMAIL
              </label>
              <input
                id="login-username"
                data-ocid="login.input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                autoComplete="username"
                className={inputBase}
                style={inputStyle}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-medium mb-1.5"
                style={{ color: "#8B9EA8" }}
              >
                PASSWORD
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  data-ocid="login.input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className={`${inputBase} pr-11`}
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                  style={{ color: "#8B9EA8" }}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div
                data-ocid="login.error_state"
                className="text-sm px-3 py-2 rounded-lg"
                style={{
                  background: "rgba(239,68,68,0.12)",
                  color: "#F87171",
                  border: "1px solid rgba(239,68,68,0.2)",
                }}
              >
                {error}
              </div>
            )}

            <button
              data-ocid="login.submit_button"
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all mt-2 flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: "#25D366" }}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: "#8B9EA8" }}>
            Don&apos;t have an account?{" "}
            <a
              href="/register"
              data-ocid="login.link"
              className="font-medium"
              style={{ color: "#25D366" }}
              onClick={(e) => {
                e.preventDefault();
                navigate({ to: "/register" });
              }}
            >
              Create account
            </a>
          </p>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "#4A5E68" }}>
          &copy; {new Date().getFullYear()}. Built with love using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#25D366" }}
          >
            caffeine.ai
          </a>
        </p>
      </motion.div>
    </div>
  );
}
