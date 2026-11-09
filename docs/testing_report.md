# Laporan Pengujian

Ini satu-satunya tempat jumlah pengujian dicatat (lihat README). Perbarui angka
di bawah setiap kali menambah atau menghapus pengujian.

Pembaruan terakhir: 20 Oktober 2026, mode data **demo** dengan dataset sintetis
1.400 post / 90 hari (`python -m app.seed --reset`), setelah penambahan partisi
lima jenis pekerjaan, preset kata kunci, dan dasar klasifikasi. Baris
aksesibilitas, visual QA, dan performa masih hasil putaran 29 Agustus 2026.

| Lapisan | Perkakas | Jumlah | Hasil |
| --- | --- | --- | --- |
| Backend unit/integration | pytest 8.3.4 | 84 (4 berkas) | ✅ lolos |
| Frontend unit/komponen | Vitest 2.1.8 + Testing Library | 50 (8 berkas) | ✅ lolos |
| End-to-end | Playwright 1.49.1 (Chromium) | 25 skenario (6 berkas) | ⚠️ 24 lolos, 1 gagal (lihat bagian 3) |
| Aksesibilitas | axe-core 4.13 (WCAG 2.1 A/AA) | 8 halaman + 5 uji manual | ✅ tanpa pelanggaran |
| Visual QA | Playwright, 4 ukuran layar | 4 pemeriksaan × 8 halaman | ✅ lolos |
| Performa | Benchmark in-process, 5.000 post | 11 endpoint | ✅ jauh di bawah target 3 detik |
| Tipe | `tsc --noEmit` (strict) | – | ✅ tanpa error |
| Lint | ESLint (`next lint`) | – | ✅ tanpa peringatan |
| Build | `next build` | 12 rute | ✅ berhasil |

## 1. Backend (84 pengujian)

| Berkas | Jumlah | Cakupan |
| --- | --- | --- |
| `tests/test_analytics.py` | 15 | Perhitungan KPI, periode pembanding, pembagi nol, deteksi puncak, indeks tren, breakdown topik/sentimen/pekerjaan, skor perhatian |
| `tests/test_api.py` | 41 | Login dan hierarki role, izin per endpoint, filter kombinasi, paginasi, alur insight dan laporan, ekspor, validasi impor CSV, penarikan X API (izin admin, penolakan tanpa token, ingest post nyata), metadata badge sintetis, dasar klasifikasi pada detail post, koreksi dan usulan koreksi label, CRUD preset kata kunci (khusus admin), partisi kategori isu × jenis pekerjaan yang cocok dengan drill-down |
| `tests/test_search_and_nlp.py` | 19 | Parser query (`AND`/`OR`/`-kata`/frasa), pengurutan relevansi, normalisasi teks, klasifikasi topik/sentimen/intent, label "Tidak Yakin", lima jenis pekerjaan naskah, aturan + kata pemicu untuk setiap label |
| `tests/test_twitterapi_io.py` | 9 | Connector twitterapi.io: pemetaan respons dan permintaan, batas halaman dan deduplikasi, error provider tanpa membocorkan isi respons dan tanpa retry, respons tidak valid, pemilihan provider + ingest |

```bash
cd apps/api && pytest
# 84 passed
```

## 2. Frontend (50 pengujian)

| Berkas | Jumlah | Cakupan |
| --- | --- | --- |
| `src/lib/filters.test.ts` | 9 | Jendela bawaan 30 hari, round-trip URL, chip filter, cross-filter toggle, parameter API |
| `src/lib/format.test.ts` | 8 | Format ribuan/persen ala Indonesia, "Tidak dapat dibandingkan", nada perubahan, waktu relatif |
| `src/components/ui.test.tsx` | 8 | Empty state, no-result, error, permission denied, badge sentimen, Escape pada drawer, konfirmasi aksi destruktif |
| `src/hooks/useFilters.test.tsx` | 4 | Filter dibaca dari URL, klik grafik → filter berubah, hapus chip, reset |
| `src/app/masuk/page.test.tsx` | 5 | Validasi form, login berhasil → redirect, pesan error Bahasa Indonesia, isi otomatis akun demo |
| `src/components/charts.test.tsx` | 5 | Tingkat warna heatmap, batas skala, kontras WCAG tiap tingkat, kelengkapan warna sentimen |
| `src/components/classification-basis.test.tsx` | 5 | Pencocokan kata pemicu, penyorotan pada teks asli, aturan keempat label, status koreksi manual, keterangan pemicu hasil normalisasi |

```bash
cd apps/web && npm run test
# Test Files 8 passed | Tests 50 passed
```

## 3. End-to-end (Tugas 1–5)

Skenario identik dengan `docs/usability_test.md`.

| Skenario | Durasi | Hasil |
| --- | --- | --- |
| Tugas 1 — topik dominan staf gudang, filter bertahan antar halaman | 7,2 s | ✅ |
| Tugas 2 — pertanyaan sistem shift, membuka 3 post | 4,8 s | ✅ |
| Tugas 3 — membandingkan sentimen Administrasi vs SPG/SPB | 3,3 s | ✅ |
| Tugas 4 — menyimpan monitor "penipuan lowongan" | 3,3 s | ✅ |
| Tugas 5 — menyusun laporan (3 insight, watermark data sintetis) | 4,1 s | ✅ |

```bash
cd apps/api && uvicorn app.main:app --port 8000    # terminal terpisah
npm run e2e                                        # dari root
```

### Fitur naskah (`tests/e2e/thesis-features.spec.ts`)

| Skenario | Hasil |
| --- | --- |
| Kartu kategori isu × jenis pekerjaan menelusur sampai daftar post (filter `topics` dan `job_roles` di URL) | ✅ |
| Preset kata kunci mengisi kueri sekali klik, tanpa mengetik | ✅ |
| Detail post menampilkan dasar klasifikasi, menyorot kata pemicu, dan admin mengoreksi label dari tampilan yang sama | ✅ |

### Tata letak cair (`tests/e2e/fluid-layout.spec.ts`)

| Skenario | Hasil |
| --- | --- |
| Filter jenis pekerjaan bertahan lintas halaman | ✅ |
| Periode dan filter bertahan saat menelusuri post | ❌ mencari tautan navigasi "Ringkasan", padahal perubahan `shell.tsx` yang belum di-commit mengganti labelnya menjadi "Beranda". Perbarui spesifikasi atau label navigasi |

### Peran dan alur data (`tests/e2e/roles-and-data.spec.ts`)

| Skenario | Hasil |
| --- | --- |
| Viewer tidak melihat aksi yang mengubah data (laporan, monitor, impor, audit) | ✅ |
| Admin mengimpor CSV: 2 dari 3 baris diproses, tercatat di log proses dan audit | ✅ |
| Impor menolak berkas tanpa kolom wajib dengan pesan yang jelas | ✅ |
| Admin menyunting taxonomy topik lalu mengembalikannya | ✅ |
| Laporan menolak disimpan tanpa insight terpilih | ✅ |

## 3b. Aksesibilitas (`tests/e2e/accessibility.spec.ts`)

Audit axe-core dijalankan pada delapan halaman dashboard dan halaman masuk
dengan tag `wcag2a`, `wcag2aa`, `wcag21a`, dan `wcag21aa` — **nol pelanggaran**.
Ditambah pemeriksaan yang tidak dapat dideteksi otomatis:

| Pemeriksaan | Hasil |
| --- | --- |
| Tab pertama mengenai "Lewati ke konten utama" | ✅ |
| Ctrl/⌘ + K membuka pencarian global, fokus ke input, Escape menutup | ✅ |
| Fokus berpindah ke konten utama setelah ganti halaman | ✅ |
| Drawer menahan fokus (12× Tab) dan mengembalikannya ke pemicu | ✅ |
| Grafik menyediakan tabel alternatif dengan `<caption>` | ✅ |

## 3c. Performa

Diukur in-process (tanpa jaringan) pada dataset **5.000 post / 180 hari**,
median dari lima pemanggilan, sekaligus menghitung jumlah query SQL per
permintaan untuk mendeteksi N+1.

| Endpoint | Median | Query SQL |
| --- | --- | --- |
| `/dashboard/overview` | 134 ms | 28 |
| `/dashboard/topics/{slug}` | 80 ms | 24 |
| `/dashboard/insight-suggestions` | 58 ms | 18 |
| `/monitors` | 50 ms | 20 |
| `/dashboard/topics` | 47 ms | 10 |
| `/dashboard/trends` | 33 ms | 10 |
| `/posts` (relevansi, halaman 1) | 21 ms | 7 |
| `/data/quality` | 16 ms | 9 |

Pada dataset demo bawaan (1.400 post) `/dashboard/overview` berada di 49 ms dan
seluruh endpoint lain di bawah 50 ms — jauh di bawah target 3 detik untuk muat
awal dashboard. Tidak ditemukan pola N+1: jumlah query tumbuh mengikuti jumlah
komponen halaman, bukan jumlah baris data.

Catatan lingkungan: pada Windows ini, hostname `localhost` menambah ~2 detik per
permintaan karena percobaan resolusi IPv6 (`::1`) sebelum jatuh ke IPv4. Angka di
atas diukur lewat `127.0.0.1`. Browser tidak terpengaruh; yang terdampak hanya
perkakas CLI seperti `curl`.

## 4. Visual QA

Screenshot delapan halaman utama diambil pada empat ukuran layar dan disimpan di
`docs/screenshots/<ukuran>/<halaman>.png` (32 berkas). Setiap halaman juga
diperiksa terhadap overflow horizontal (`scrollWidth − clientWidth ≤ 1 px`).

| Ukuran | Hasil |
| --- | --- |
| 1366×768 (target utama) | ✅ tanpa overflow |
| 1920×1080 | ✅ tanpa overflow |
| Tablet 768×1024 | ✅ tanpa overflow |
| Mobile 390×844 | ✅ tanpa overflow |

### Temuan visual yang diperbaiki pada putaran ini

| Temuan | Perbaikan |
| --- | --- |
| Overview meluber horizontal pada 390 px (heatmap dan jaringan kata kunci mendorong grid) | `Card` diberi `min-w-0` sehingga wadah gulirnya bekerja di dalam grid |
| Pencarian Post meluber pada 390 px (kontrol urutkan/per-halaman di header kartu) | Area aksi kartu dibuat dapat membungkus (`flex-wrap`) |
| Top bar menampilkan "Memuat periode…" pada halaman non-analitik | Label periode memakai filter aktif sebagai cadangan |
| Overlay dev Next.js menandai 1 error: `router.replace` dipanggil dari dalam updater state `FilterProvider` (pembaruan Router saat render) | Penulisan filter ke URL dipindah ke `useEffect` setelah render |
| Halaman login selalu memanggil `/auth/me` tanpa token sehingga memunculkan 401 di konsol | Panggilan dilewati bila belum ada token tersimpan |

## 5. Perbaikan lain hasil pengujian

| Temuan | Perbaikan |
| --- | --- |
| **Fokus terlempar keluar drawer** saat halaman render ulang: effect drawer bergantung pada handler yang identitasnya berubah tiap render, sehingga cleanup-nya mengembalikan fokus ke pemicu | Handler disimpan pada ref; effect hanya bergantung pada `open` |
| Fokus tetap di posisi lama setelah berpindah halaman | Fokus dipindahkan ke `<main>` pada perubahan path (penanda "render pertama" diganti perbandingan path karena Strict Mode menjalankan effect dua kali) |
| Teks berwarna (positif/peringatan/negatif/netral) gagal kontras WCAG AA di atas latar terang | Ditambah token `*-strong` khusus teks; warna dasar tetap untuk ikon, garis, dan latar |
| Sel heatmap memakai teks putih di atas biru muda (kontras 2,6:1) | Skala warna dibuat berjenjang dan melewati rentang menengah yang tidak aman |
| Tautan di dalam paragraf hanya dibedakan lewat warna | Ditambah garis bawah permanen |
| SVG jaringan kata kunci berperan `img` padahal simpulnya dapat difokus | Perannya diubah menjadi `group` |
| Audit log tidak ikut disegarkan setelah impor/analisis ulang/ubah taxonomy | Query `audit` ikut di-invalidate pada mutasi terkait |
| `focus:ring-primary/20` tidak pernah dihasilkan Tailwind sehingga cincin fokus input hilang | Design token warna ditulis sebagai kanal RGB dan dipetakan dengan `<alpha-value>` |
| Ringkasan insight menyebut basa-basi ("halo semua", "numpang tanya") | Daftar stopword diperluas untuk sapaan percakapan |
| Seluruh draft insight menyebut kata kunci yang sama | Kata kunci dihitung per topik, bukan dari filter global |

## 6. Yang belum diuji otomatis

- Mode data **live** (memerlukan credential X API resmi).
- Jalur PostgreSQL untuk pencarian teks penuh (`to_tsvector`) — pengujian lokal
  memakai SQLite; jalur ini diuji manual melalui `docker compose`.
- Ekspor PDF diverifikasi lewat status HTTP dan tipe konten, bukan isi visual berkas.
- Pengujian dengan pengguna sungguhan (dijadwalkan; skrip siap di
  `docs/usability_test.md`).
