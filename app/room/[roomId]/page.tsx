"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { 
  Search, 
  PlusCircle, 
  ListVideo, 
  Users, 
  Send, 
  Copy, 
  Check, 
  Play, 
  Trash2, 
  Loader2, 
  Pause, 
  RotateCcw, 
  Film, 
  UserCheck, 
  Smile, 
  MessageSquare, 
  X, 
  Crown, 
  Lock,
  LogIn,
  LogOut
} from "lucide-react";
import AuthModal from "@/components/AuthModal";

interface VideoSearchResult {
  videoId: string;
  title: string;
  thumbnail: string;
  timestamp: string;
  author: string;
  url: string;
}

interface FloatingEmoji {
  id: number;
  emoji: string;
  left: number;
}

const REACTION_EMOJIS = ["❤️", "🔥", "😂", "👏", "🍿", "🚀"];

function extractYouTubeId(urlOrId: string): string {
  if (!urlOrId) return "";
  const clean = urlOrId.trim();

  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) {
    return clean;
  }

  const shortMatch = clean.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch && shortMatch[1]) return shortMatch[1];

  const watchMatch = clean.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch && watchMatch[1]) return watchMatch[1];

  const embedMatch = clean.match(/(?:embed|shorts)\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch && embedMatch[1]) return embedMatch[1];

  return clean;
}

function RoomContent() {
  const params = useParams();
  const roomId = (params?.roomId as string) || "karo";

  const socketRef = useRef<Socket | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const isRemoteAction = useRef(false);
  const currentTimeRef = useRef<number>(0);

  // Kullanıcı & Oturum Durumları
  const [authUser, setAuthUser] = useState<{ username: string; email: string } | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [username, setUsername] = useState<string>("");
  const [tempName, setTempName] = useState<string>("");
  const [isNameSet, setIsNameSet] = useState<boolean>(false);
  const [roomUsers, setRoomUsers] = useState<string[]>([]);
  const [hostName, setHostName] = useState<string>("");

  // Auth Modal
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  // Video Durumları
  const [videoId, setVideoId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [inputUrl, setInputUrl] = useState("");
  const [copied, setCopied] = useState(false);

  // Canlı Uçuşan Tepkiler
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);

  // Paneller ve Ortak Kuyruk
  const [activeModal, setActiveModal] = useState<"search" | "add" | "queue" | "friends" | null>(null);
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const [queue, setQueue] = useState<string[]>([]);
  const queueRef = useRef<string[]>([]);
  queueRef.current = queue;

  // YouTube Arama
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<VideoSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Canlı Sohbet
  const [messages, setMessages] = useState<{ sender: string; text: string; time: string }[]>([
    { sender: "Sistem", text: `Oda #${roomId} hazır! Arkadaşlarını davet edebilirsin.`, time: "Canlı" }
  ]);
  const [newMessage, setNewMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const isHost = Boolean(username && hostName && username === hostName);

  const sendIframeCommand = (func: string, args: any[] = []) => {
    if (!iframeRef.current || !iframeRef.current.contentWindow) return;
    iframeRef.current.contentWindow.postMessage(
      JSON.stringify({ event: "command", func, args }),
      "*"
    );
  };

  const onIframeLoad = () => {
    if (!iframeRef.current || !iframeRef.current.contentWindow) return;
    iframeRef.current.contentWindow.postMessage(
      JSON.stringify({ event: "listening" }),
      "*"
    );
    sendIframeCommand("addEventListener", ["onStateChange"]);
  };

  const triggerFloatingEmoji = (emoji: string) => {
    const id = Date.now() + Math.random();
    const left = Math.floor(Math.random() * 60) + 20;

    setFloatingEmojis((prev) => [...prev, { id, emoji, left }]);

    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((item) => item.id !== id));
    }, 2000);
  };

  const playVideoById = (nextId: string) => {
    setVideoId(nextId);
    setIsPlaying(true);
    currentTimeRef.current = 0;
    setActiveModal(null);
    setInputUrl("");

    if (socketRef.current) {
      socketRef.current.emit("sync-video", {
        roomId,
        isPlaying: true,
        playedSeconds: 0,
        videoUrl: `https://www.youtube.com/watch?v=${nextId}`
      });
    }
  };

  // 1. YouTube Iframe Dinleyicisi
  useEffect(() => {
    const handleYouTubeMessage = (e: MessageEvent) => {
      if (!e.data) return;

      let data: any = e.data;
      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch {
          return;
        }
      }

      if (data.event === "infoDelivery" && data.info) {
        if (typeof data.info.currentTime === "number") {
          const newTime = data.info.currentTime;
          if (isHost && !isRemoteAction.current && Math.abs(newTime - currentTimeRef.current) > 2) {
            currentTimeRef.current = newTime;
            socketRef.current?.emit("sync-video", {
              roomId,
              isPlaying,
              playedSeconds: newTime,
              videoUrl: videoId ? `https://www.youtube.com/watch?v=${videoId}` : ""
            });
          } else {
            currentTimeRef.current = newTime;
          }
        }
      }

      if (data.event === "onStateChange" || (data.info && typeof data.info.playerState === "number")) {
        const state = typeof data.info === "number" ? data.info : data.info?.playerState;
        if (isRemoteAction.current) return;

        if (state === 0 && isHost) {
          if (queueRef.current.length > 0) {
            const nextVideo = queueRef.current[0];
            const updatedQueue = queueRef.current.slice(1);
            setQueue(updatedQueue);
            socketRef.current?.emit("update-queue", { roomId, queue: updatedQueue });
            playVideoById(nextVideo);
            return;
          }
        }

        if (isHost) {
          if (state === 1) {
            setIsPlaying(true);
            socketRef.current?.emit("sync-video", {
              roomId,
              isPlaying: true,
              playedSeconds: currentTimeRef.current,
              videoUrl: videoId ? `https://www.youtube.com/watch?v=${videoId}` : ""
            });
          } else if (state === 2) {
            setIsPlaying(false);
            socketRef.current?.emit("sync-video", {
              roomId,
              isPlaying: false,
              playedSeconds: currentTimeRef.current,
              videoUrl: videoId ? `https://www.youtube.com/watch?v=${videoId}` : ""
            });
          }
        }
      }
    };

    window.addEventListener("message", handleYouTubeMessage);
    return () => {
      window.removeEventListener("message", handleYouTubeMessage);
    };
  }, [roomId, videoId, isPlaying, isHost]);

  // 2. Oturum Kontrolü & Soket Başlatma
  useEffect(() => {
  const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";
const socket = io(SOCKET_URL, {
  transports: ["websocket", "polling"],
});
    socketRef.current = socket;

    socket.on("user-list", (data: { users: string[]; hostName: string } | string[]) => {
      if (Array.isArray(data)) {
        setRoomUsers(data);
      } else {
        setRoomUsers(data.users || []);
        setHostName(data.hostName || "");
      }
    });

    socket.on("queue-updated", (newQueue: string[]) => {
      setQueue(newQueue || []);
    });

    socket.on("video-updated", ({ isPlaying: remotePlaying, playedSeconds, videoUrl: remoteUrl }) => {
      isRemoteAction.current = true;

      if (remoteUrl) {
        const parsedId = extractYouTubeId(remoteUrl);
        if (parsedId) {
          setVideoId(parsedId);
        }
      }

      const targetSeconds = typeof playedSeconds === "number" ? playedSeconds : currentTimeRef.current;
      currentTimeRef.current = targetSeconds;
      setIsPlaying(Boolean(remotePlaying));

      setTimeout(() => {
        sendIframeCommand("seekTo", [targetSeconds, true]);
        if (remotePlaying) {
          sendIframeCommand("playVideo");
        } else {
          sendIframeCommand("pauseVideo");
        }
      }, 400);

      setTimeout(() => {
        isRemoteAction.current = false;
      }, 800);
    });

    socket.on("message-received", (msg: { sender: string; text: string; time: string }) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("reaction-received", (emoji: string) => {
      triggerFloatingEmoji(emoji);
    });

    // Oturum Kontrolü
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setAuthUser(data.user);
          setUsername(data.user.username);
          setIsNameSet(true);
          socket.emit("join-room", { roomId, username: data.user.username });
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsAuthChecking(false);
      });

    return () => {
      socket.disconnect();
    };
  }, [roomId]);

  const handleSendReaction = (emoji: string) => {
    triggerFloatingEmoji(emoji);
    socketRef.current?.emit("send-reaction", { roomId, reaction: emoji });
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempName.trim()) return;
    const finalName = tempName.trim();
    setUsername(finalName);
    setIsNameSet(true);

    if (socketRef.current) {
      socketRef.current.emit("join-room", { roomId, username: finalName });
    }
  };

  const handleAuthSuccess = (user: { username: string; email: string }) => {
    setAuthUser(user);
    setUsername(user.username);
    setIsNameSet(true);
    if (socketRef.current) {
      socketRef.current.emit("join-room", { roomId, username: user.username });
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuthUser(null);
    window.location.reload();
  };

  const handleLoadVideo = (rawInput: string) => {
    if (!isHost) {
      alert("Yalnızca oda yöneticisi yeni video başlatabilir!");
      return;
    }
    const cleanId = extractYouTubeId(rawInput);
    if (!cleanId) return;
    playVideoById(cleanId);
  };

  const togglePlay = () => {
    if (!isHost || !videoId) return;
    const nextState = !isPlaying;
    setIsPlaying(nextState);

    const nowSeconds = currentTimeRef.current;

    if (nextState) {
      sendIframeCommand("playVideo");
    } else {
      sendIframeCommand("pauseVideo");
    }

    socketRef.current?.emit("sync-video", {
      roomId,
      isPlaying: nextState,
      playedSeconds: nowSeconds,
      videoUrl: `https://www.youtube.com/watch?v=${videoId}`
    });
  };

  const handleRestart = () => {
    if (!isHost || !videoId) return;
    currentTimeRef.current = 0;
    sendIframeCommand("seekTo", [0, true]);
    sendIframeCommand("playVideo");
    setIsPlaying(true);

    socketRef.current?.emit("sync-video", {
      roomId,
      isPlaying: true,
      playedSeconds: 0,
      videoUrl: `https://www.youtube.com/watch?v=${videoId}`
    });
  };

  const handleAddToQueue = (rawInput: string) => {
    if (!rawInput.trim()) return;
    const cleanId = extractYouTubeId(rawInput);
    if (!cleanId) return;

    const updated = [...queue, cleanId];
    setQueue(updated);
    socketRef.current?.emit("update-queue", { roomId, queue: updated });
    setInputUrl("");
  };

  const handleRemoveFromQueue = (index: number) => {
    if (!isHost) {
      alert("Yalnızca oda yöneticisi sıradan video silebilir!");
      return;
    }
    const updated = queue.filter((_, i) => i !== index);
    setQueue(updated);
    socketRef.current?.emit("update-queue", { roomId, queue: updated });
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery.trim())}`);
      const data = await res.json();
      if (data.videos) {
        setSearchResults(data.videos);
      }
    } catch (err) {
      console.error("Arama hatası:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !socketRef.current) return;

    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const senderName = isHost ? `👑 ${username}` : username || "Sen";
    const messageData = { sender: senderName, text: newMessage.trim(), time };

    setMessages((prev) => [...prev, { ...messageData, sender: "Sen" }]);
    socketRef.current.emit("send-message", { roomId, message: messageData });
    setNewMessage("");
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex h-screen w-full flex-col bg-zinc-950 font-sans text-zinc-100 overflow-hidden select-none">
      
      {/* 1. MİSAFİR İSİM GİRİŞ MODAL'I (Yalnızca Oturum Yoksa) */}
      {!isAuthChecking && !isNameSet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 text-white font-black">
                K
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Karo'ya Katıl</h3>
                <p className="text-xs text-zinc-400">Oda: <span className="font-mono text-zinc-200">#{roomId}</span></p>
              </div>
            </div>

            <form onSubmit={handleJoin} className="space-y-3">
              <input
                type="text"
                autoFocus
                placeholder="Misafir olarak takma adın..."
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-zinc-400"
              />
              <button
                type="submit"
                disabled={!tempName.trim()}
                className="w-full rounded-xl bg-white py-2.5 text-xs font-bold text-zinc-950 hover:bg-zinc-200 transition-colors disabled:opacity-50"
              >
                Misafir Olarak Katıl
              </button>
            </form>

            <div className="pt-2 border-t border-zinc-800 text-center">
              <p className="text-xs text-zinc-400">
                veya{" "}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("login");
                    setIsAuthOpen(true);
                  }}
                  className="font-bold text-white hover:underline inline-flex items-center gap-1"
                >
                  <LogIn className="h-3 w-3" />
                  Hesabına Giriş Yap
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ÜST BAR */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-900/60 px-4 sm:px-6 backdrop-blur-md gap-2">
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-white font-black text-sm">
              K
            </div>
            <span className="font-bold text-base sm:text-lg tracking-wider text-white">KARO</span>
          </Link>
          <span className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-0.5 font-mono text-[11px] sm:text-xs text-zinc-400">
            #{roomId}
          </span>
          {username && (
            <span className={`hidden sm:inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium ${
              isHost ? "bg-amber-500/10 border-amber-500/30 text-amber-300" : "bg-zinc-800/60 border-zinc-700/50 text-zinc-300"
            }`}>
              {isHost ? <Crown className="h-3 w-3 text-amber-400" /> : <UserCheck className="h-3 w-3 text-emerald-400" />}
              {username} {isHost && "(Host)"}
            </span>
          )}
        </div>

        {/* Menü Butonları */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => setActiveModal(activeModal === "search" ? null : "search")}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-medium shrink-0 transition-all ${
              activeModal === "search" ? "bg-zinc-200 text-zinc-950" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Yeni Video Ara</span>
          </button>

          <button
            onClick={() => setActiveModal(activeModal === "add" ? null : "add")}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-medium shrink-0 transition-all ${
              activeModal === "add" ? "bg-zinc-200 text-zinc-950" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            <PlusCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Video Ekle</span>
          </button>

          <button
            onClick={() => setActiveModal(activeModal === "queue" ? null : "queue")}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-medium shrink-0 transition-all ${
              activeModal === "queue" ? "bg-zinc-200 text-zinc-950" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            <ListVideo className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>Sıra ({queue.length})</span>
          </button>

          <button
            onClick={() => setActiveModal(activeModal === "friends" ? null : "friends")}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-medium shrink-0 transition-all ${
              activeModal === "friends" ? "bg-zinc-200 text-zinc-950" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>({roomUsers.length})</span>
          </button>

          <button
            onClick={() => setIsMobileChatOpen(true)}
            className="flex lg:hidden items-center gap-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 shrink-0 relative"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 absolute top-1 right-1" />
          </button>
        </div>

        {/* Sağ: Link Kopyala & Kullanıcı Durumu */}
        <div className="shrink-0 flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-medium transition-all ${
              copied ? "bg-emerald-600 text-white" : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
            }`}
          >
            {copied ? <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
            <span className="hidden md:inline">{copied ? "Kopyalandı!" : "Linki Kopyala"}</span>
          </button>

          {authUser ? (
            <button
              onClick={handleLogout}
              className="hidden sm:flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-400 hover:text-rose-400 transition-colors"
              title="Çıkış Yap"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              onClick={() => {
                setAuthMode("login");
                setIsAuthOpen(true);
              }}
              className="hidden sm:flex items-center gap-1 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-zinc-950 hover:bg-zinc-200 transition-colors"
            >
              Giriş Yap
            </button>
          )}
        </div>
      </header>

      {/* AÇILIR MODAL PANELLERİ */}
      {activeModal && (
        <div className="border-b border-zinc-800 bg-zinc-900/95 px-4 sm:px-6 py-4 backdrop-blur-xl max-h-96 overflow-y-auto z-40">
          <div className="mx-auto max-w-3xl">
            {activeModal === "search" && (
              <div className="space-y-4">
                <form onSubmit={handleSearch} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="YouTube'da video ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-zinc-500"
                  />
                  <button
                    type="submit"
                    disabled={isSearching}
                    className="flex items-center gap-2 rounded-xl bg-white px-4 sm:px-5 py-2.5 text-xs font-bold text-zinc-950 hover:bg-zinc-200 transition-colors disabled:opacity-50"
                  >
                    {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    Ara
                  </button>
                </form>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {searchResults.map((video) => (
                    <div 
                      key={video.videoId}
                      className="flex gap-3 rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-2 hover:border-zinc-700 transition-all group"
                    >
                      <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-zinc-900">
                        <Image src={video.thumbnail} alt={video.title} fill className="object-cover" unoptimized />
                        <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 text-[10px] text-zinc-300 font-mono">
                          {video.timestamp}
                        </span>
                      </div>
                      
                      <div className="flex flex-1 flex-col justify-between overflow-hidden">
                        <div>
                          <h4 className="text-xs font-medium text-zinc-200 line-clamp-1 group-hover:text-white">
                            {video.title}
                          </h4>
                          <p className="text-[11px] text-zinc-500">{video.author}</p>
                        </div>
                        
                        <div className="flex items-center gap-2 pt-1">
                          {isHost && (
                            <button
                              type="button"
                              onClick={() => handleLoadVideo(video.videoId || video.url)}
                              className="rounded-lg bg-zinc-200 px-2.5 py-1 text-[10px] font-bold text-zinc-950 hover:bg-white"
                            >
                              Oynat
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleAddToQueue(video.videoId || video.url)}
                            className="rounded-lg bg-zinc-800 px-2.5 py-1 text-[10px] font-semibold text-zinc-300 hover:bg-zinc-700"
                          >
                            Sıraya Ekle
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeModal === "add" && (
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (isHost) {
                    handleLoadVideo(inputUrl);
                  } else {
                    handleAddToQueue(inputUrl);
                  }
                }} 
                className="flex gap-2"
              >
                <input
                  type="text"
                  placeholder="YouTube linki yapıştırın..."
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-zinc-500"
                />
                {isHost && (
                  <button
                    type="submit"
                    className="rounded-xl bg-white px-4 sm:px-5 py-2.5 text-xs font-bold text-zinc-950 hover:bg-zinc-200 transition-colors"
                  >
                    Şimdi Oynat
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleAddToQueue(inputUrl)}
                  className="rounded-xl bg-zinc-800 px-3.5 py-2.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition-colors"
                >
                  Sıraya Ekle
                </button>
              </form>
            )}

            {activeModal === "queue" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Ortak Oynatma Sırası</span>
                  <span className="text-[10px] text-zinc-500 font-mono">Video bitince otomatik geçer</span>
                </div>
                {queue.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-3 text-center">Sırada henüz video yok.</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-1.5">
                    {queue.map((qId, idx) => (
                      <div key={idx} className="flex items-center justify-between rounded-lg bg-zinc-950 p-2 text-xs">
                        <span className="truncate max-w-md text-zinc-300 font-mono">{idx + 1}. Video: {qId}</span>
                        <div className="flex items-center gap-2">
                          {isHost && (
                            <>
                              <button type="button" onClick={() => handleLoadVideo(qId)} className="text-emerald-400 hover:text-emerald-300" title="Şimdi Başlat">
                                <Play className="h-3.5 w-3.5" />
                              </button>
                              <button type="button" onClick={() => handleRemoveFromQueue(idx)} className="text-rose-400 hover:text-rose-300" title="Sıradan Sil">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeModal === "friends" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Odadaki Katılımcılar ({roomUsers.length})
                  </span>
                  <span className="text-[11px] text-zinc-500 font-mono">
                    Host: <span className="text-amber-400 font-semibold">{hostName || "Belirlenmedi"}</span>
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                  {roomUsers.map((user, idx) => {
                    const isUserHost = user === hostName;
                    return (
                      <div key={idx} className={`flex items-center gap-2.5 rounded-xl border p-2.5 ${
                        isUserHost ? "border-amber-500/30 bg-amber-500/5" : "border-zinc-800 bg-zinc-950/80"
                      }`}>
                        <div className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-bold text-xs ${
                          isUserHost ? "bg-amber-500/20 text-amber-300" : "bg-zinc-800 text-zinc-200"
                        }`}>
                          {isUserHost ? <Crown className="h-4 w-4 text-amber-400" /> : user.charAt(0).toUpperCase()}
                          <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-zinc-950" />
                        </div>
                        <div className="flex-1 truncate">
                          <span className="text-xs font-medium text-zinc-200 truncate flex items-center gap-1">
                            {user} {user === username && <span className="text-[10px] text-zinc-500">(Sen)</span>}
                          </span>
                          <span className="text-[10px] text-emerald-400">
                            {isUserHost ? "Oda Kurucusu" : "İzleyici"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* GÖVDE: %66 Sol Video, %33 Sağ Chat */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* SOL VİDEO BÖLGESİ */}
        <section className="w-full lg:w-2/3 flex flex-col justify-center items-center bg-black p-2 sm:p-4 md:p-6 lg:p-8 relative overflow-y-auto">
          
          <div className="relative aspect-video w-full max-h-[70vh] sm:max-h-[76vh] overflow-hidden rounded-xl sm:rounded-2xl border border-zinc-800/80 bg-zinc-950 shadow-2xl flex items-center justify-center">
            
            {/* UÇUŞAN CANLI EMOJİLER */}
            <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
              {floatingEmojis.map((item) => (
                <div
                  key={item.id}
                  style={{ left: `${item.left}%` }}
                  className="absolute bottom-4 text-2xl sm:text-4xl animate-bounce transition-all duration-1000 ease-out transform -translate-y-56 sm:-translate-y-72 opacity-90"
                >
                  {item.emoji}
                </div>
              ))}
            </div>

            {videoId ? (
              <iframe
                key={videoId}
                ref={iframeRef}
                onLoad={onIframeLoad}
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&enablejsapi=1&playsinline=1&widget_referrer=${typeof window !== "undefined" ? encodeURIComponent(window.location.href) : ""}&origin=${typeof window !== "undefined" ? encodeURIComponent(window.location.origin) : ""}`}
                title="Karo Player"
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-4 sm:p-6 space-y-3">
                <div className="flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-500">
                  <Film className="h-6 w-6 sm:h-8 sm:w-8" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-zinc-200">Henüz Bir Video Başlatılmadı</h3>
                  <p className="text-[11px] sm:text-xs text-zinc-500 mt-1 max-w-sm">
                    {isHost ? "Yukarıdaki menüden video seçip başlatabilirsiniz." : "Oda yöneticisinin video başlatması bekleniyor..."}
                  </p>
                </div>
                {isHost && (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setActiveModal("search")}
                      className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-zinc-950 hover:bg-zinc-200 transition-colors"
                    >
                      <Search className="h-3.5 w-3.5" />
                      Video Ara
                    </button>
                    <button
                      onClick={() => setActiveModal("add")}
                      className="flex items-center gap-1.5 rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      Link Ekle
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ORTAK KONTROL & TEPKİ ÇUBUĞU */}
          {videoId && (
            <div className="mt-3 sm:mt-4 flex flex-wrap items-center justify-center gap-2 sm:gap-3 bg-zinc-900/90 border border-zinc-800 px-3 py-2 sm:px-5 sm:py-2.5 rounded-xl sm:rounded-2xl backdrop-blur-md shadow-xl w-full max-w-lg">
              {isHost ? (
                <>
                  <button
                    onClick={togglePlay}
                    className="flex items-center gap-1.5 bg-white text-zinc-950 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-xs font-bold hover:bg-zinc-200 transition-all"
                  >
                    {isPlaying ? <Pause className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-zinc-950" />}
                    <span>{isPlaying ? "Durdur" : "Başlat"}</span>
                  </button>

                  <button
                    onClick={handleRestart}
                    className="flex items-center gap-1.5 bg-zinc-800 text-zinc-200 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl text-xs font-medium hover:bg-zinc-700 transition-all"
                    title="Başa Sar"
                  >
                    <RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span>Başa Sar</span>
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-zinc-400 bg-zinc-800/60 px-3 py-1.5 rounded-lg border border-zinc-700/50">
                  <Lock className="h-3.5 w-3.5 text-zinc-400" />
                  <span>Kontrol Host'ta ({hostName})</span>
                </div>
              )}

              <div className="h-4 w-[1px] bg-zinc-800 hidden sm:block" />

              <div className="flex items-center gap-0.5 sm:gap-1">
                {REACTION_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleSendReaction(emoji)}
                    className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg hover:bg-zinc-800 active:scale-125 transition-all text-sm sm:text-base"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* SAĞ SOHBET */}
        <aside className="hidden lg:flex lg:w-1/3 flex-col border-l border-zinc-800 bg-zinc-900/50">
          <div className="flex h-14 items-center justify-between border-b border-zinc-800 px-5">
            <span className="font-semibold text-sm text-zinc-200">Canlı Sohbet</span>
            <span className="text-xs text-emerald-400 font-mono">Senkronize</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, index) => (
              <div key={index} className="rounded-xl border border-zinc-800/50 bg-zinc-950/70 p-3 text-xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className={`font-bold ${msg.sender.includes("👑") ? "text-amber-400" : msg.sender === "Sen" ? "text-indigo-400" : "text-zinc-300"}`}>
                    {msg.sender}
                  </span>
                  <span className="text-[10px] text-zinc-500">{msg.time}</span>
                </div>
                <p className="text-zinc-200">{msg.text}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-zinc-800 p-3 bg-zinc-950/60 relative">
            {showEmojiPicker && (
              <div className="absolute bottom-16 left-3 bg-zinc-900 border border-zinc-800 rounded-xl p-2 shadow-2xl flex gap-1 z-40">
                {["😀", "🔥", "❤️", "🎉", "💀", "👀", "✨"].map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => {
                      setNewMessage((prev) => prev + e);
                      setShowEmojiPicker(false);
                    }}
                    className="p-1 hover:bg-zinc-800 rounded text-sm transition-colors"
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={handleSendMessage} className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 px-3 text-zinc-400 hover:text-white transition-colors"
              >
                <Smile className="h-4 w-4" />
              </button>
              <input
                type="text"
                placeholder="Bir mesaj yaz..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-zinc-500"
              />
              <button
                type="submit"
                className="flex items-center justify-center rounded-xl bg-white px-4 text-zinc-950 font-bold hover:bg-zinc-200 transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </aside>

        {/* MOBİL SOHBET ÇEKMECESİ */}
        {isMobileChatOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/70 backdrop-blur-sm lg:hidden">
            <div className="h-[80vh] w-full rounded-t-3xl border-t border-zinc-800 bg-zinc-900 flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200">
              <div className="flex h-14 items-center justify-between border-b border-zinc-800 px-5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-zinc-200">Canlı Sohbet</span>
                  <span className="text-[10px] text-emerald-400 font-mono">#{roomId}</span>
                </div>
                <button
                  onClick={() => setIsMobileChatOpen(false)}
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg, index) => (
                  <div key={index} className="rounded-xl border border-zinc-800/60 bg-zinc-950/80 p-3 text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className={`font-bold ${msg.sender.includes("👑") ? "text-amber-400" : msg.sender === "Sen" ? "text-indigo-400" : "text-zinc-300"}`}>
                        {msg.sender}
                      </span>
                      <span className="text-[10px] text-zinc-500">{msg.time}</span>
                    </div>
                    <p className="text-zinc-200">{msg.text}</p>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSendMessage} className="border-t border-zinc-800 p-3 bg-zinc-950 flex gap-2">
                <input
                  type="text"
                  placeholder="Bir mesaj yaz..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-zinc-500"
                />
                <button
                  type="submit"
                  className="flex items-center justify-center rounded-xl bg-white px-4 text-zinc-950 font-bold hover:bg-zinc-200 transition-colors"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        )}

      </div>

      {/* KİMLİK DOĞRULAMA MODAL'I */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        defaultMode={authMode}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}

export default function RoomPage() {
  return (
    <Suspense fallback={<div className="h-screen w-screen bg-zinc-950 flex items-center justify-center text-zinc-400">Yükleniyor...</div>}>
      <RoomContent />
    </Suspense>
  );
}