# Design Tokens TalentPulse

Token didefinisikan sebagai CSS variable di `apps/web/src/app/globals.css` dan
dipetakan ke utility Tailwind pada `apps/web/tailwind.config.ts`. Nilai warna
ditulis sebagai **kanal RGB tanpa fungsi `rgb()`** agar modifier opacity Tailwind
(`bg-warning/10`) tetap bekerja pada token yang sama.

## 1. Warna

| Token | Nilai | Hex | Pemakaian |
| --- | --- | --- | --- |
| `--tp-canvas` | `246 248 252` | `#f6f8fc` | Latar aplikasi |
| `--tp-surface` | `255 255 255` | `#ffffff` | Kartu, panel, drawer |
| `--tp-surface-muted` | `249 250 251` | `#f9fafb` | Baris tabel, blok kutipan |
| `--tp-sidebar` | `11 18 32` | `#0b1220` | Sidebar, tooltip, overlay |
| `--tp-sidebar-hover` | `22 32 58` | `#16203a` | Hover item sidebar |
| `--tp-primary` | `37 99 235` | `#2563eb` | Aksi utama, tautan, seri utama grafik |
| `--tp-primary-soft` | `238 244 255` | `#eef4ff` | Latar chip aktif, badge |
| `--tp-primary-strong` | `29 78 216` | `#1d4ed8` | Hover tombol utama |
| `--tp-secondary` | `6 182 212` | `#06b6d4` | Seri pembanding |
| `--tp-text` | `17 24 39` | `#111827` | Teks utama |
| `--tp-text-muted` | `102 112 133` | `#667085` | Teks sekunder, sumbu grafik |
| `--tp-border` | `228 231 236` | `#e4e7ec` | Garis, pemisah |
| `--tp-positive` | `22 163 74` | `#16a34a` | Sentimen positif, tren membaik |
| `--tp-warning` | `245 158 11` | `#f59e0b` | Data demo, "Tidak Yakin", lonjakan |
| `--tp-negative` | `220 38 38` | `#dc2626` | Sentimen negatif, aksi destruktif |
| `--tp-neutral` | `100 116 139` | `#64748b` | Sentimen netral |

### Aturan warna

- Sentimen tidak pernah dibedakan hanya lewat warna: setiap badge memuat teks
  label dan simbol (▲ ● ▼ ?).
- Kontras teks terhadap latar minimal 4,5:1 (WCAG AA).
- Warna topik disimpan per topik di basis data agar konsisten antar grafik.

## 2. Tipografi

| Token | Nilai |
| --- | --- |
| Keluarga | Inter (`--font-sans`), fallback system-ui |
| `text-base` | 14 px / 1,45 rem |
| `text-sm` | 13 px / 1,2 rem |
| `text-xs` | 12 px / 1,1 rem |
| Judul halaman | 20 px, semibold, tracking rapat |
| Judul kartu | 15 px, semibold |
| Angka KPI | 24–28 px, semibold, `font-variant-numeric: tabular-nums` |

Seluruh angka memakai kelas `.tabular` agar kolom angka pada tabel dan KPI rata.

## 3. Spacing dan radius

| Token | Nilai | Pemakaian |
| --- | --- | --- |
| Grid gap | 12–16 px | Antar kartu |
| Padding kartu | 20 px horizontal, 16 px vertikal | `.tp-card` |
| `rounded-card` | 14 px | Kartu, drawer, dialog |
| `rounded-lg` | 8 px | Tombol, input, item daftar |
| Lebar sidebar | 236 px (68 px saat diciutkan) | |
| Lebar panel filter | 268 px | Menetap pada ≥1280 px |
| Lebar konten maksimum | 1440 px | Terpusat pada layar lebar |

## 4. Elevasi

| Token | Nilai |
| --- | --- |
| `shadow-card` | `0 1px 2px rgba(16,24,40,.05), 0 1px 3px rgba(16,24,40,.04)` |
| `shadow-raised` | `0 8px 24px rgba(16,24,40,.10)` |
| `shadow-drawer` | `-12px 0 40px rgba(16,24,40,.14)` |

## 5. Komponen dasar

| Kelas | Keterangan |
| --- | --- |
| `.tp-card` | Kartu dengan border, radius 14 px, bayangan halus |
| `.tp-btn` | Tombol netral; `+ .tp-btn-primary` untuk aksi utama |
| `.tp-chip` | Chip filter/preset; aktif memakai border dan latar primary-soft |
| `.tp-input` | Input, select, dan textarea dengan cincin fokus |
| `.tp-label` | Label huruf kecil kapital, tracking lebar |
| `.tp-skeleton` | Placeholder loading dengan animasi shimmer |
| `.tp-scroll-x` | Wadah gulir horizontal untuk tabel lebar |
| `.no-print` | Disembunyikan saat halaman dicetak |
| `.tabular` | Angka tabular |

## 6. Motion

| Animasi | Durasi |
| --- | --- |
| `fade-in` | 160 ms ease-out (dialog, overlay) |
| `slide-in` | 180 ms ease-out (drawer, sidebar mobile) |
| `shimmer` | 1,4 s loop (skeleton) |
| Transisi hover | 150 ms bawaan Tailwind |

## 7. Breakpoint

| Breakpoint | Perilaku |
| --- | --- |
| < 768 px | Satu kolom, sidebar dan filter menjadi drawer |
| 768–1279 px | Dua kolom, sidebar dapat diciutkan |
| ≥ 1280 px | Panel filter menetap di kanan |
| ≥ 1536 px | Konten dibatasi 1440 px dan dipusatkan |

Target utama pengujian: 1366×768 dan 1920×1080.

## 8. Aksesibilitas

- Fokus terlihat: outline 2 px warna primary dengan offset 2 px.
- Tautan "Lewati ke konten utama" pada awal dokumen.
- Drawer dan dialog menahan fokus serta menutup dengan Escape.
- Setiap grafik memiliki alternatif tabel data dan ringkasan `sr-only`.
- Ikon dekoratif diberi `aria-hidden`; tombol ikon memiliki `aria-label`.
- Status dinamis memakai `role="status"` / `aria-live="polite"`.
