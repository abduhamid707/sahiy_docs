"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import logoSahiy from "../../../public/logo_sahiy.png";

const CURRENT_YEAR = new Date().getFullYear();

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    setEmail(normalizedEmail);
    setPassword(normalizedPassword);
    setLoading(true);
    setError("");

    try {
      const response = await signIn("credentials", {
        email: normalizedEmail,
        password: normalizedPassword,
        callbackUrl: "/crm",
        redirect: false,
      });

      if (response?.error) {
        setError(
          response.error === "CredentialsSignin"
            ? "Email yoki parol noto‘g‘ri"
            : "Kirishda kutilmagan xatolik yuz berdi",
        );
        setLoading(false);
        return;
      }

      router.replace("/crm");
      router.refresh();
    } catch {
      setError("Server bilan ulanishda xatolik yuz berdi");
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-slate-100 px-4 py-8 dark:bg-[#06141c] sm:px-6">
      <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:linear-gradient(to_right,rgba(100,116,139,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(100,116,139,0.08)_1px,transparent_1px)] [background-size:32px_32px] dark:opacity-20" />
      <div className="pointer-events-none absolute -left-24 top-[-8rem] size-72 rounded-full bg-[#ddb96c]/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 right-[-7rem] size-80 rounded-full bg-[#0a2937]/15 blur-3xl dark:bg-[#ddb96c]/10" />

      <section className="relative grid w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.14)] dark:border-white/10 dark:bg-slate-950 dark:shadow-black/40 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="relative hidden min-h-[570px] overflow-hidden bg-[#0a2937] p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-8 -top-8 size-40 rounded-full border border-[#ddb96c]/20" />
          <div>
            <Image
              src={logoSahiy}
              alt="Sahiy"
              width={72}
              height={72}
              priority
              className="h-16 w-16 object-contain"
            />
            <p className="mt-8 text-[10px] font-bold uppercase tracking-[0.28em] text-[#ddb96c]">
              Ichki boshqaruv tizimi
            </p>
            <h1 className="mt-3 max-w-xs text-3xl font-bold leading-tight tracking-tight">
              Jamoa ishlarini bir joydan boshqaring.
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-300">
              CRM murojaatlari, ichki hujjatlar va hisobotlar uchun xavfsiz ish maydoni.
            </p>
          </div>

          <div className="flex items-center gap-3 border-t border-white/10 pt-6 text-xs text-slate-300">
            <span className="flex size-8 items-center justify-center rounded-lg bg-white/10 text-[#ddb96c]">
              <ShieldCheck className="size-4" />
            </span>
            Faqat ruxsat berilgan xodimlar uchun
          </div>
        </div>

        <div className="flex min-h-[570px] flex-col justify-center p-6 sm:p-10 lg:p-12">
          <div className="mb-8 lg:hidden">
            <Image
              src={logoSahiy}
              alt="Sahiy"
              width={60}
              height={60}
              priority
              className="h-14 w-14 object-contain"
            />
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#936a2d] dark:text-[#ddb96c]">
              Sahiy portal
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Tizimga kirish
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Ishni davom ettirish uchun login ma’lumotlaringizni kiriting.
            </p>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="login-email" className="text-xs font-semibold text-foreground">
                Email manzili
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="login-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  autoFocus
                  className="h-12 w-full rounded-xl border border-input bg-background pl-10 pr-4 text-sm outline-none transition focus:border-[#0a2937]/50 focus:ring-4 focus:ring-[#0a2937]/10 dark:focus:border-[#ddb96c]/50 dark:focus:ring-[#ddb96c]/10"
                  placeholder="name@gmail.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  onBlur={() => setEmail((value) => value.trim())}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="login-password" className="text-xs font-semibold text-foreground">
                Parol
              </label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  className="h-12 w-full rounded-xl border border-input bg-background pl-10 pr-11 text-sm outline-none transition focus:border-[#0a2937]/50 focus:ring-4 focus:ring-[#0a2937]/10 dark:focus:border-[#ddb96c]/50 dark:focus:ring-[#ddb96c]/10"
                  placeholder="Parolingizni kiriting"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute right-2.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  aria-label={showPassword ? "Parolni yashirish" : "Parolni ko‘rsatish"}
                  title={showPassword ? "Parolni yashirish" : "Parolni ko‘rsatish"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0a2937] px-5 text-sm font-semibold text-white shadow-lg shadow-[#0a2937]/15 transition hover:bg-[#10394a] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0a2937]/20 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#ddb96c] dark:text-[#0a2937] dark:hover:bg-[#e7c77f]"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Kirilmoqda...
                </>
              ) : (
                <>
                  Tizimga kirish
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            © {CURRENT_YEAR} Sahiy IT Team
          </p>
        </div>
      </section>
    </main>
  );
}
