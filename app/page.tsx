"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Play, 
  Sparkles, 
  Users, 
  Tv, 
  Radio, 
  ArrowRight, 
  UserCheck, 
  LogOut 
} from "lucide-react";
import AuthModal from "@/components/AuthModal";

export default function Home() {
  const router = useRouter();
  const [roomIdInput, setRoomIdInput] = useState("");
  const [user, setUser] = useState<{ username: string; email: string } | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  // Aktif oturumu kontrol et
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
        }
      })
      .catch(() => setUser(null));
  }, []);

  // Çıkış yap
  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  };

  // Yeni Oda Oluştur
  const handleCreateRoom = () => {
    const randomId = Math.random().toString(36).substring(2, 8);
    router.push(`/room/${randomId}`);
  };

  // Var Olan Odaya Katıl
  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomIdInput.trim()) return;
    const cleanId = roomIdInput.trim().replace("#", "");
    router.push(`/room/${cleanId}`);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-zinc-800">
      
      {/* ÜST BAR (NAVBAR) */}
      <header className="flex h-16 items-center justify-between border-b border-zinc-800/80 px-6 sm:px-12 bg-zinc-950/70 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-zinc-950 font-black text-base shadow-sm">
            K
          </div>
          <span className="font-extrabold text-lg tracking-wider text-white">KARO</span>
        </div>

        {/* Sağ Üst: Kullanıcı / Giriş Alanı */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs text-zinc-200">
                <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span className="font-medium">{user.username}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-rose-400 hover:border-rose-500/30 transition-all"
                title="Çıkış Yap"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Çıkış</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setAuthMode("login");
                  setIsAuthOpen(true);
                }}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors"
              >
                Giriş Yap
              </button>
              <button
                onClick={() => {
                  setAuthMode("register");
                  setIsAuthOpen(true);
                }}
                className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-zinc-200 transition-colors shadow-sm"
              >
                Kayıt Ol
              </button>
            </div>
          )}
        </div>
      </header>

      {/* GÖVDE: HERO BÖLÜMÜ */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center max-w-4xl mx-auto space-y-8">
        
        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-4 py-1.5 text-xs text-zinc-300 backdrop-blur-md">
          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          <span>Eşzamanlı YouTube & Video İzleme Platformu</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
          Arkadaşlarınla Aynı Anda, <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-200 via-zinc-400 to-zinc-600">
            Sıfır Gecikmeyle İzle.
          </span>
        </h1>

        <p className="text-sm sm:text-base text-zinc-400 max-w-xl">
          Bir oda oluştur veya mevcut odaya katıl; YouTube videolarını milisaniyelik senkronizasyon, canlı sohbet ve reaksiyonlarla birlikte deneyimle.
        </p>

        {/* AKSİYON KARTLARI */}
        <div className="w-full max-w-md space-y-3 pt-4">
          <button
            onClick={handleCreateRoom}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-sm font-bold text-zinc-950 hover:bg-zinc-200 active:scale-[0.99] transition-all shadow-xl"
          >
            <Play className="h-4 w-4 fill-zinc-950" />
            <span>Hızlıca Yeni Oda Başlat</span>
          </button>

          <div className="flex items-center gap-3 py-1">
            <div className="h-[1px] flex-1 bg-zinc-800" />
            <span className="text-[11px] uppercase tracking-wider text-zinc-600 font-semibold">veya</span>
            <div className="h-[1px] flex-1 bg-zinc-800" />
          </div>

          <form onSubmit={handleJoinRoom} className="flex gap-2">
            <input
              type="text"
              placeholder="Oda Kodunu Gir (örn: 290vg4)"
              value={roomIdInput}
              onChange={(e) => setRoomIdInput(e.target.value)}
              className="flex-1 rounded-2xl border border-zinc-800 bg-zinc-900/80 px-4 py-3 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-zinc-500 transition-colors"
            />
            <button
              type="submit"
              disabled={!roomIdInput.trim()}
              className="flex items-center gap-1.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 px-5 text-xs sm:text-sm font-semibold text-white transition-colors disabled:opacity-50"
            >
              <span>Katıl</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>

        {/* ÖNE ÇIKAN ÖZELLİKLER */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full pt-12 text-left">
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-5 space-y-2">
            <Tv className="h-5 w-5 text-zinc-300" />
            <h4 className="text-sm font-bold text-white">Canlı Senkron</h4>
            <p className="text-xs text-zinc-500">Durdurma, oynatma ve sarma hareketleri herkesin ekranına anında yansır.</p>
          </div>

          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-5 space-y-2">
            <Radio className="h-5 w-5 text-zinc-300" />
            <h4 className="text-sm font-bold text-white">Canlı Reaksiyonlar</h4>
            <p className="text-xs text-zinc-500">Video akarken ekranda uçuşan emojiler ve canlı oda sohbeti.</p>
          </div>

          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-5 space-y-2">
            <Users className="h-5 w-5 text-zinc-300" />
            <h4 className="text-sm font-bold text-white">Host Yetki Modu</h4>
            <p className="text-xs text-zinc-500">Oda kurucusu kontrolleri yönetir, sıradaki videolar kesintisiz oynar.</p>
          </div>
        </div>
      </main>

      {/* KİMLİK DOĞRULAMA MODAL'I */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        defaultMode={authMode}
        onSuccess={(loggedUser) => setUser(loggedUser)}
      />

    </div>
  );
}