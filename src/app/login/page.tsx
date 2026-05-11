"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import logoSahiy from "../../../public/logo_sahiy.png";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        // Specific error check to avoid flashes
        if (res.error === "CredentialsSignin") {
          setError("Email yoki parol noto'g'ri");
        } else {
          setError("Kirishda kutilmagan xatolik yuz berdi");
        }
        setLoading(false);
      } else {
        // Only redirect if there is no error
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      setError("Server bilan ulanishda xatolik yuz berdi");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f172a] relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse delay-1000"></div>
      </div>

      <div className="w-full max-w-md space-y-10 relative z-10 px-6">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center h-20 w-20 mb-4 animate-bounce duration-[3000ms]">
            <Image src={logoSahiy} alt="Sahiy Logo" width={80} height={80} className="object-contain" />
          </div>
          <h2 className="text-4xl sm:text-5xl font-black tracking-tighter text-white">
            Sahiy Docs
          </h2>
          <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px]">
            Ichki hujjatlar portali
          </p>
        </div>
 
        <div className="bg-white/5 backdrop-blur-2xl rounded-[2.5rem] p-8 sm:p-10 border border-white/10 shadow-2xl shadow-black/50">
          <form className="space-y-8" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-2xl bg-red-500/10 border border-red-500/20 py-3 text-center text-xs font-bold text-red-400 animate-shake">
                {error}
              </div>
            )}
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-4">Email manzili</label>
                <input
                  type="email"
                  required
                  className="block w-full rounded-2xl bg-white/5 border border-white/10 py-4 px-6 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all outline-none font-medium"
                  placeholder="name@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-4">Parol</label>
                <input
                  type="password"
                  required
                  className="block w-full rounded-2xl bg-white/5 border border-white/10 py-4 px-6 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all outline-none font-medium"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-sm uppercase tracking-widest"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Kirilmoqda...
                </div>
              ) : "Tizimga kirish"}
            </button>
          </form>
        </div>

        <div className="text-center">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
            &copy; {new Date().getFullYear()} Sahiy IT Team
          </p>
        </div>
      </div>
    </div>
  );
}
