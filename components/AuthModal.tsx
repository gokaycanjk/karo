"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Lock, Mail, User } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: { username: string; email: string }) => void;
  defaultMode?: "login" | "register";
}

export default function AuthModal({ isOpen, onClose, onSuccess, defaultMode = "login" }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">(defaultMode);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [loginIdentifier, setLoginIdentifier] = useState(""); // Giriş ekranı için tekil alan
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMode(defaultMode);
      setError("");
    }
  }, [isOpen, defaultMode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "register") {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Kayıt başarısız.");

        // Kayıt sonrası otomatik giriş
        const loginRes = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emailOrUser: username, password }),
        });
        const loginData = await loginRes.json();
        if (!loginRes.ok) throw new Error(loginData.error || "Giriş başarısız.");

        onSuccess(loginData.user);
        onClose();
      } else {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emailOrUser: loginIdentifier, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Giriş başarısız.");

        onSuccess(data.user);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl relative space-y-4">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-zinc-400 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 text-white font-black text-sm">
            K
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              {mode === "login" ? "Karo'ya Giriş Yap" : "Karo'ya Kayıt Ol"}
            </h3>
            <p className="text-xs text-zinc-400">
              {mode === "login" ? "Hesabına giriş yap ve odalara katıl" : "Hesap oluştur ve hemen başla"}
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          {mode === "register" ? (
            <>
              {/* KAYIT: KULLANICI ADI */}
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Kullanıcı adı"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 pl-9 pr-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-zinc-400"
                />
              </div>

              {/* KAYIT: E-POSTA (Tamamen bağımsız) */}
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                <input
                  type="email"
                  placeholder="E-posta adresi"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 pl-9 pr-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-zinc-400"
                />
              </div>
            </>
          ) : (
            /* GİRİŞ: KULLANICI ADI VEYA E-POSTA */
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Kullanıcı adı veya E-posta"
                required
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 pl-9 pr-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-zinc-400"
              />
            </div>
          )}

          {/* ŞİFRE ALANI */}
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
            <input
              type="password"
              placeholder="Şifre"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 pl-9 pr-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-zinc-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-white py-2.5 text-xs font-bold text-zinc-950 hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "login" ? "Giriş Yap" : "Hesap Oluştur"}
          </button>
        </form>

        <div className="text-center text-xs text-zinc-400 pt-2 border-t border-zinc-800/80">
          {mode === "login" ? (
            <p>
              Hesabın yok mu?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setError("");
                }}
                className="font-bold text-white hover:underline"
              >
                Kayıt Ol
              </button>
            </p>
          ) : (
            <p>
              Zaten hesabın var mı?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError("");
                }}
                className="font-bold text-white hover:underline"
              >
                Giriş Yap
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}