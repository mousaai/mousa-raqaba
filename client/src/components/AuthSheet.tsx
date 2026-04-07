/**
 * AuthSheet — Smart Marketing Auth Bottom Sheet
 * بدلاً من صفحة تسجيل الدخول الكاملة، يظهر bottom sheet أنيق من الأسفل
 * يحتوي على رسالة تسويقية + Google/Apple + بريد إلكتروني
 *
 * الاستخدام:
 *   import { useAuthSheet } from "@/components/AuthSheet";
 *   const { openAuthSheet, AuthSheetComponent } = useAuthSheet();
 *   <button onClick={() => openAuthSheet()}>استخدم المنصة</button>
 *   <AuthSheetComponent />
 */
import { useState, useEffect, useCallback } from "react";
import { TRPCClientError } from "@trpc/client";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Eye, EyeOff, Mail, Lock, User, Loader2, Sparkles, X } from "lucide-react";

// ─── Global event bus for AuthSheet ────────────────────────────────────────
type AuthSheetEvent = { returnUrl?: string; message?: string };
const AUTH_SHEET_EVENT = "mousa:open-auth-sheet";

export function openAuthSheet(opts: AuthSheetEvent = {}) {
  window.dispatchEvent(new CustomEvent(AUTH_SHEET_EVENT, { detail: opts }));
}

// ─── Build OAuth URLs ────────────────────────────────────────────────────────
function buildOAuthUrl(provider: "google" | "apple", returnPath: string): string {
  const encoded = encodeURIComponent(returnPath);
  const lang = localStorage.getItem("mousa_lang") || "ar";
  return `/api/auth/${provider}?returnPath=${encoded}&lang=${lang}`;
}

// ─── Tab type ────────────────────────────────────────────────────────────────
type Tab = "social" | "login" | "register";

// ─── AuthSheet Component ─────────────────────────────────────────────────────
export default function AuthSheet() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("social");
  const [returnUrl, setReturnUrl] = useState("/dashboard");
  const [message, setMessage] = useState<string | null>(null);

  // Email/password state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Auto-open disabled — login sheet opens only on explicit user action
  // (Previously auto-opened on returnPath param, removed to avoid unwanted popups)

  // Listen for open events
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<AuthSheetEvent>).detail || {};
      setReturnUrl(detail.returnUrl || window.location.href);
      setMessage(detail.message || null);
      setTab("social");
      setEmail("");
      setPassword("");
      setName("");
      setOpen(true);
    };
    window.addEventListener(AUTH_SHEET_EVENT, handler);
    return () => window.removeEventListener(AUTH_SHEET_EVENT, handler);
  }, []);

  // Close on backdrop click
  const close = useCallback(() => setOpen(false), []);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Login mutation
  const loginMutation = trpc.auth.loginWithPassword.useMutation({
    onSuccess: () => {
      toast.success("مرحباً بك! 👋");
      setOpen(false);
      // Small delay to let cookie be set before reload
      setTimeout(() => {
        if (returnUrl.startsWith("http")) {
          window.location.href = returnUrl;
        } else {
          window.location.reload();
        }
      }, 300);
    },
    onError: (err: unknown) => {
      const code = err instanceof TRPCClientError ? err.data?.code : undefined;
      if (code === "UNAUTHORIZED") {
        toast.error("البريد الإلكتروني أو كلمة المرور غير صحيحة");
      } else {
        toast.error(err instanceof Error ? err.message : "فشل تسجيل الدخول");
      }
    },
  });

  // Register mutation
  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      toast.success("🎉 مرحباً بك! تم إنشاء حسابك وإضافة 200 كريدت مجاني");
      setOpen(false);
      setTimeout(() => {
        if (returnUrl.startsWith("http")) {
          window.location.href = returnUrl;
        } else {
          window.location.reload();
        }
      }, 300);
    },
    onError: (err: unknown) => {
      const code = err instanceof TRPCClientError ? err.data?.code : undefined;
      if (code === "CONFLICT") {
        toast.error("البريد الإلكتروني مسجل مسبقاً — سجّل الدخول");
        setTab("login");
      } else {
        toast.error(err instanceof Error ? err.message : "فشل إنشاء الحساب");
      }
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error("أدخل البريد وكلمة المرور");
    loginMutation.mutate({ email, password });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return toast.error("يرجى ملء جميع الحقول");
    if (password.length < 8) return toast.error("كلمة المرور 8 أحرف على الأقل");
    registerMutation.mutate({ name, email, password });
  };

  // Build return path for OAuth (relative if same origin, full URL if different)
  const oauthReturnPath = (() => {
    try {
      const u = new URL(returnUrl);
      if (u.origin === window.location.origin) {
        return u.pathname + u.search;
      }
      // Cross-origin (subdomain) — use post-login bridge
      const platform = u.hostname.split(".")[0];
      if (["fada", "raqaba", "harara", "maskan", "code", "khayal"].includes(platform)) {
        return `/api/platform/post-login?platform=${platform}&returnTo=${encodeURIComponent(returnUrl)}`;
      }
      return u.pathname;
    } catch {
      return "/dashboard";
    }
  })();

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={close}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(4px)",
          zIndex: 9998,
          animation: "fadeIn 0.2s ease",
        }}
      />

      {/* Sheet */}
      <div
        dir="rtl"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          background: "linear-gradient(180deg, #0D1B2A 0%, #080E1A 100%)",
          border: "1px solid rgba(212,160,23,0.2)",
          borderBottom: "none",
          borderRadius: "24px 24px 0 0",
          padding: "0 0 env(safe-area-inset-bottom, 16px)",
          maxHeight: "92vh",
          overflowY: "auto",
          animation: "slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
          boxShadow: "0 -20px 60px rgba(0,0,0,0.6)",
        }}
      >
        {/* Handle bar */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: "12px", paddingBottom: "4px" }}>
          <div style={{ width: "40px", height: "4px", borderRadius: "2px", background: "rgba(212,160,23,0.3)" }} />
        </div>

        {/* Close button */}
        <button
          onClick={close}
          style={{
            position: "absolute",
            top: "16px",
            left: "16px",
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#8899A6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <X size={16} />
        </button>

        <div style={{ padding: "8px 20px 24px" }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(212,160,23,0.1)",
              border: "1px solid rgba(212,160,23,0.25)",
              borderRadius: "20px",
              padding: "4px 14px",
              marginBottom: "12px",
            }}>
              <Sparkles size={12} style={{ color: "#D4A017" }} />
              <span style={{ color: "#D4A017", fontSize: "12px", fontWeight: 600 }}>
                200 كريدت مجاني عند التسجيل
              </span>
            </div>

            {message ? (
              <p style={{ color: "#E8EDF2", fontSize: "16px", fontWeight: 700, marginBottom: "4px" }}>
                {message}
              </p>
            ) : (
              <p style={{ color: "#E8EDF2", fontSize: "16px", fontWeight: 700, marginBottom: "4px" }}>
                ابدأ مجاناً مع mousa.ai
              </p>
            )}
            <p style={{ color: "#8899A6", fontSize: "13px" }}>
              حساب واحد لجميع المنصات الست
            </p>
          </div>

          {/* Social buttons — always visible */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
            <a href={buildOAuthUrl("google", oauthReturnPath)} style={{ display: "block", textDecoration: "none" }}>
              <button style={{
                width: "100%",
                padding: "13px 16px",
                borderRadius: "12px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(212,160,23,0.2)",
                color: "#E8EDF2",
                fontSize: "14px",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                cursor: "pointer",
                fontFamily: "inherit",
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                الدخول بـ Google
              </button>
            </a>

            <a href={buildOAuthUrl("apple", oauthReturnPath)} style={{ display: "block", textDecoration: "none" }}>
              <button style={{
                width: "100%",
                padding: "13px 16px",
                borderRadius: "12px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(212,160,23,0.2)",
                color: "#E8EDF2",
                fontSize: "14px",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                cursor: "pointer",
                fontFamily: "inherit",
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                الدخول بـ Apple
              </button>
            </a>
          </div>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <div style={{ flex: 1, height: "1px", background: "rgba(212,160,23,0.12)" }} />
            <span style={{ color: "#556677", fontSize: "12px" }}>أو بالبريد الإلكتروني</span>
            <div style={{ flex: 1, height: "1px", background: "rgba(212,160,23,0.12)" }} />
          </div>

          {/* Tab switcher */}
          <div style={{
            display: "flex",
            background: "rgba(255,255,255,0.04)",
            borderRadius: "10px",
            padding: "3px",
            marginBottom: "16px",
          }}>
            <button
              onClick={() => setTab("login")}
              style={{
                flex: 1,
                padding: "8px",
                borderRadius: "8px",
                background: tab === "login" ? "rgba(212,160,23,0.15)" : "transparent",
                border: tab === "login" ? "1px solid rgba(212,160,23,0.3)" : "1px solid transparent",
                color: tab === "login" ? "#D4A017" : "#8899A6",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.2s",
              }}
            >
              تسجيل الدخول
            </button>
            <button
              onClick={() => setTab("register")}
              style={{
                flex: 1,
                padding: "8px",
                borderRadius: "8px",
                background: tab === "register" ? "rgba(212,160,23,0.15)" : "transparent",
                border: tab === "register" ? "1px solid rgba(212,160,23,0.3)" : "1px solid transparent",
                color: tab === "register" ? "#D4A017" : "#8899A6",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.2s",
              }}
            >
              حساب جديد
            </button>
          </div>

          {/* Login form */}
          {tab === "login" && (
            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ position: "relative" }}>
                <Mail size={15} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "#556677" }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  dir="ltr"
                  autoComplete="email"
                  style={{
                    width: "100%",
                    padding: "12px 40px 12px 12px",
                    borderRadius: "10px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(212,160,23,0.2)",
                    color: "#E8EDF2",
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                  }}
                />
              </div>
              <div style={{ position: "relative" }}>
                <Lock size={15} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "#556677" }} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="كلمة المرور"
                  dir="ltr"
                  autoComplete="current-password"
                  style={{
                    width: "100%",
                    padding: "12px 40px 12px 40px",
                    borderRadius: "10px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(212,160,23,0.2)",
                    color: "#E8EDF2",
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#556677", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <a href="/forgot-password" style={{ color: "#D4A017", fontSize: "12px", textAlign: "left", display: "block", textDecoration: "none" }}>
                نسيت كلمة المرور؟
              </a>
              <button
                type="submit"
                disabled={loginMutation.isPending}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #D4A017, #B8860B)",
                  border: "none",
                  color: "#080E1A",
                  fontSize: "15px",
                  fontWeight: 700,
                  cursor: loginMutation.isPending ? "not-allowed" : "pointer",
                  opacity: loginMutation.isPending ? 0.7 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  fontFamily: "inherit",
                }}
              >
                {loginMutation.isPending ? (
                  <><Loader2 size={16} className="animate-spin" />جاري الدخول...</>
                ) : (
                  "تسجيل الدخول"
                )}
              </button>
            </form>
          )}

          {/* Register form */}
          {tab === "register" && (
            <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ position: "relative" }}>
                <User size={15} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "#556677" }} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="الاسم الكامل"
                  autoComplete="name"
                  style={{
                    width: "100%",
                    padding: "12px 40px 12px 12px",
                    borderRadius: "10px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(212,160,23,0.2)",
                    color: "#E8EDF2",
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                  }}
                />
              </div>
              <div style={{ position: "relative" }}>
                <Mail size={15} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "#556677" }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  dir="ltr"
                  autoComplete="email"
                  style={{
                    width: "100%",
                    padding: "12px 40px 12px 12px",
                    borderRadius: "10px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(212,160,23,0.2)",
                    color: "#E8EDF2",
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                  }}
                />
              </div>
              <div style={{ position: "relative" }}>
                <Lock size={15} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "#556677" }} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="كلمة المرور (8 أحرف+)"
                  dir="ltr"
                  autoComplete="new-password"
                  style={{
                    width: "100%",
                    padding: "12px 40px 12px 40px",
                    borderRadius: "10px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(212,160,23,0.2)",
                    color: "#E8EDF2",
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#556677", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <button
                type="submit"
                disabled={registerMutation.isPending}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #D4A017, #B8860B)",
                  border: "none",
                  color: "#080E1A",
                  fontSize: "15px",
                  fontWeight: 700,
                  cursor: registerMutation.isPending ? "not-allowed" : "pointer",
                  opacity: registerMutation.isPending ? 0.7 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  fontFamily: "inherit",
                }}
              >
                {registerMutation.isPending ? (
                  <><Loader2 size={16} className="animate-spin" />جاري إنشاء الحساب...</>
                ) : (
                  <>
                    <Sparkles size={15} />
                    إنشاء حساب مجاني
                  </>
                )}
              </button>
              <p style={{ color: "#556677", fontSize: "11px", textAlign: "center" }}>
                بالتسجيل توافق على{" "}
                <a href="/terms" style={{ color: "#D4A017", textDecoration: "none" }}>الشروط</a>
                {" "}و{" "}
                <a href="/privacy" style={{ color: "#D4A017", textDecoration: "none" }}>سياسة الخصوصية</a>
              </p>
            </form>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
      `}</style>
    </>
  );
}

// ─── Hook for easy usage ─────────────────────────────────────────────────────
export function useAuthSheet() {
  return {
    openAuthSheet,
    AuthSheetComponent: AuthSheet,
  };
}
