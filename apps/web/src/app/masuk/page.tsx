"use client";

import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { useAuth } from "@/hooks/useAuth";
import { BrandMark } from "@/components/brand-mark";
import { ApiError, apiRequest } from "@/lib/api";

interface DemoAccount {
  name: string;
  email: string;
}

const HOW_IT_WORKS: Array<[string, string]> = [
  ["Himpun", "Unggahan dan balasan publik dikumpulkan dari X berdasarkan kata kunci."],
  [
    "Kelompokkan",
    "Setiap unggahan diberi label isu, sentimen, dan jenis pekerjaan, yang dapat dikoreksi pengguna.",
  ],
  [
    "Deteksi",
    "Jumlah unggahan setiap minggu dibandingkan dengan minggu-minggu sebelumnya untuk menandai lonjakan.",
  ],
  [
    "Tindak lanjuti",
    "Telusuri sampai unggahan asli, susun insight, setujui, lalu ekspor laporan.",
  ],
];

export default function LoginPage() {
  const router = useRouter();
  const { user, isLoading, login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [accounts, setAccounts] = useState<DemoAccount[]>([]);
  const [demoPassword, setDemoPassword] = useState("");

  useEffect(() => {
    if (!isLoading && user) router.replace("/");
  }, [isLoading, user, router]);

  useEffect(() => {
    apiRequest<{ accounts: DemoAccount[]; password: string }>("/auth/demo-accounts")
      .then((data) => {
        setAccounts(data.accounts);
        setDemoPassword(data.password);
      })
      .catch(() => {
        /* Pada environment produksi daftar akun demo memang tidak tersedia. */
      });
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!email.trim()) return setError("Email wajib diisi.");
    if (!password) return setError("Kata sandi wajib diisi.");

    setSubmitting(true);
    try {
      await login(email.trim(), password);
      router.replace("/");
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.userMessage
          : "Terjadi kesalahan tidak terduga.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Panel kiri: konteks produk, bukan klaim afiliasi dengan platform mana pun. */}
      <section className="tp-login-panel relative hidden flex-col justify-between border-r border-line p-10 text-ink lg:flex xl:p-14">
        <div className="flex items-center gap-2.5 text-ink">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-white">
            <BrandMark className="h-6 w-6" />
          </span>
          <span className="text-3xl font-semibold tracking-[-0.04em]">TalentPulse</span>
        </div>

        <div className="max-w-xl py-12">
          <p className="mb-6 text-xs font-medium uppercase tracking-[0.18em] text-primary">Dasbor informasi TalentPulse</p>
          <h1 className="text-[40px] font-medium leading-[1.08] tracking-[-0.05em] text-ink xl:text-[52px]">
            Ketahui isu pekerja alih daya yang sedang meningkat di X.
          </h1>
          <p className="mt-7 max-w-md text-sm leading-relaxed text-muted">
            Keluhan pekerja alih daya tentang upah, potongan gaji, kontrak, dan
            penempatan banyak muncul di X, tetapi tersebar dan cepat tenggelam. Dasbor
            ini menghimpun percakapan tersebut agar tim PT Siprama Cakrawala dapat
            melihat isu yang meningkat dan menanggapinya berdasarkan data.
          </p>

          <dl className="mt-10 grid grid-cols-2 gap-x-8 gap-y-5 border-t border-primary/20 pt-6 text-xs">
            {HOW_IT_WORKS.map(([label, value]) => (
              <div key={label}>
                <dt className="font-medium text-ink">{label}</dt>
                <dd className="mt-1.5 leading-relaxed text-muted">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="max-w-lg text-[11px] leading-relaxed text-muted">
          Prototipe tugas akhir berbasis karya untuk PT Siprama Cakrawala. Tidak
          berafiliasi resmi dengan X. Identitas akun disamarkan dan data tidak digunakan
          untuk menilai atau mengambil keputusan tentang individu.
        </p>
      </section>

      <section className="flex items-center justify-center bg-surface px-5 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-6 lg:hidden">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-white">
              <BrandMark className="h-6 w-6" />
            </span>
            <h1 className="mt-3 text-2xl font-semibold">TalentPulse</h1>
          </div>

          <h2 className="text-[32px] font-medium leading-tight tracking-[-0.05em]">Masuk ke dashboard</h2>
          <p className="mt-1.5 text-xs leading-relaxed text-muted">
            Aplikasi ini adalah prototipe internal. Data yang ditampilkan pada mode
            demo bersifat sintetis dan bukan kondisi aktual.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="tp-label">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={Boolean(error)}
                className="tp-input"
                placeholder="nama@perusahaan.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="tp-label">
                Kata sandi
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-invalid={Boolean(error)}
                  className="tp-input pr-11"
                  placeholder="Masukkan kata sandi"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted transition hover:text-ink"
                  aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-lg border border-negative/20 bg-negative/5 px-3 py-2 text-xs text-negative-strong"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="tp-btn tp-btn-primary w-full py-2.5"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {submitting ? "Memproses…" : "Masuk"}
            </button>
          </form>

          {accounts.length > 0 && (
            <div className="mt-6 rounded-card border border-line bg-surface-muted p-4">
              <p className="text-xs font-medium text-ink">Akun demo untuk presentasi</p>
              <ul className="mt-2 space-y-1">
                {accounts.map((account) => (
                  <li key={account.email}>
                    <button
                      type="button"
                      onClick={() => {
                        setEmail(account.email);
                        setPassword(demoPassword);
                        setError(null);
                      }}
                      className="w-full rounded-md border border-transparent px-2 py-1.5 text-left transition hover:border-line hover:bg-surface"
                    >
                      <span className="block text-xs font-medium text-ink">{account.name}</span>
                      <span className="block text-[11px] text-muted">{account.email}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-muted">
                Klik nama untuk mengisi email dan kata sandi.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
