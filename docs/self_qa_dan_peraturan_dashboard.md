# Analisis Proyek, Self-QA, dan Peraturan Penggunaan Dashboard

**Produk:** TalentPulse  
**Tanggal pemeriksaan:** 17 September 2026  
**Cakupan:** kode backend dan frontend, dokumentasi, kontrol akses, alur data,
pengujian otomatis, serta aturan penggunaan operasional.

## 1. Kesimpulan eksekutif

TalentPulse sudah layak dipakai sebagai **prototipe akademis dan demo internal**.
Fungsi utama lengkap, struktur aplikasinya jelas, antarmuka responsif, dan suite
tes yang dijalankan ulang menunjukkan hasil baik. Posisi etik produk juga sudah
tegas: dashboard mendukung komunikasi rekrutmen dan bukan alat seleksi kandidat.

TalentPulse **belum layak untuk produksi dengan data nyata** tanpa perbaikan
kontrol persetujuan, kepemilikan objek, pengamanan konfigurasi produksi, dan
kebijakan retensi/penghapusan data. Status rilis yang disarankan:

| Lingkungan | Keputusan | Syarat |
| --- | --- | --- |
| Demo lokal dengan data sintetis | Layak | Badge `DATA DEMO` dan disclaimer tetap tampil |
| Uji pengguna terkontrol | Layak bersyarat | Gunakan akun uji, data sintetis, dan skrip usability yang tersedia |
| Produksi internal dengan data nyata | Belum layak | Tutup temuan prioritas tinggi pada bagian 5 |

## 2. Analisis produk

### Tujuan dan batas produk

TalentPulse membantu tim Recruitment/HR membaca percakapan publik pencari kerja,
menemukan topik atau pertanyaan berulang, memantau perubahan, dan menyusun bahan
FAQ atau komunikasi lowongan. Produk tidak boleh digunakan untuk:

- menerima, menolak, memberi skor, atau membuat profil kandidat;
- mencari atau mengelompokkan orang berdasarkan identitas;
- menyimpulkan atribut sensitif;
- menganggap volume, sentimen, atau engagement sebagai kebenaran atau representasi
  seluruh populasi pencari kerja.

### Arsitektur dan alur utama

| Area | Implementasi | Penilaian |
| --- | --- | --- |
| Frontend | Next.js 15, React 19, TypeScript, Tailwind, React Query, Recharts | Terstruktur baik dan bertipe ketat |
| Backend | FastAPI, SQLAlchemy, Alembic, JWT, pipeline NLP berbasis aturan | Modular dan mudah dijelaskan |
| Data | SQLite untuk lokal, PostgreSQL untuk deployment, connector demo/impor/X API resmi | Pemisahan sumber data sudah baik |
| Hak akses | `viewer` < `analyst` < `admin` | Dasar RBAC ada, tetapi otorisasi objek belum konsisten |
| Pelaporan | Insight, status peninjauan, laporan PDF/CSV, audit log | Fungsional, tetapi workflow belum ditegakkan oleh API |
| Etika | Larangan profiling, tanpa scraping, ekspor dibatasi, data sintetis diberi label | Arah benar; beberapa klaim perlu diselaraskan dengan kode |

Delapan halaman dashboard mengikuti pertanyaan kerja pengguna, bukan struktur
database: Ringkasan, Tren, Topik, Post, monitoring, Laporan, Data, dan Metodologi.
Pilihan ini cocok untuk pengguna HR nonteknis.

### Kekuatan utama

1. Ruang lingkup dan batas etik dinyatakan berulang di UI dan dokumentasi.
2. Metadata analitik memuat periode, sumber data, filter, versi model, dan status
   kesegaran sehingga angka lebih mudah diaudit.
3. Data demo dapat direproduksi dan dibedakan dari data nyata.
4. Query, impor, NLP, insight, laporan, aksesibilitas, dan role sudah mempunyai
   pengujian otomatis.
5. Ekspor post-level dibatasi maksimal 200 referensi dan tidak memuat teks atau
   identitas penulis.
6. Connector resmi tidak menyimpan nama pengguna X; credential hanya berada di
   server.

## 3. Hasil self-QA aktual

Pemeriksaan dijalankan ulang dari working tree pada tanggal dokumen ini.

| Pemeriksaan | Hasil | Catatan |
| --- | --- | --- |
| Backend `pytest` | **61/61 lolos** | Menggunakan virtual environment proyek |
| Frontend Vitest | **43/43 lolos** | 7 berkas tes |
| Type-check frontend | **Lolos** | TypeScript strict, tanpa error |
| Type-check E2E/root | **Lolos** | Tanpa error |
| ESLint frontend | **Lolos** | Tanpa warning atau error |
| Production build | **Lolos** | 11 route berhasil dibangun |
| E2E terpilih | **16/16 skenario mencapai status lolos** | Aksesibilitas, role/data, dan Tugas 1–5; dijalankan pada salinan database |

Catatan E2E: seluruh 16 skenario mencetak status lulus, tetapi proses runner tidak
keluar otomatis setelah web server selesai diuji sehingga dihentikan manual saat
teardown. Ini tidak menggagalkan skenario, tetapi perilaku teardown perlu
diselidiki agar CI tidak menggantung.

Visual regression 32 screenshot dan benchmark performa tidak diulang pada putaran
ini. Bukti hasil sebelumnya masih tersedia di `docs/testing_report.md` dan
`docs/screenshots/`, tetapi tidak boleh dianggap sebagai hasil baru 17 September
2026.

### Matriks self-QA fungsional

| Area | Pemeriksaan | Status |
| --- | --- | --- |
| Login | Login valid, pesan gagal generik, redirect, role | Lolos otomatis |
| Dashboard | KPI, filter lintas halaman, tren, topik, post | Lolos otomatis |
| Pencarian | `AND`, `OR`, `-kata`, frasa, relevansi | Lolos otomatis |
| Monitoring | Buat monitor dan bandingkan periode | Lolos otomatis |
| Insight/laporan | Buat insight dan laporan, preview, ekspor | Lolos fungsi dasar; governance perlu perbaikan |
| Data | Impor valid/invalid, kualitas data, taxonomy | Lolos otomatis |
| RBAC | Viewer read-only; admin untuk impor/taxonomy/audit | Lolos skenario yang tersedia |
| Aksesibilitas | Axe WCAG 2.1 AA, keyboard, fokus, tabel alternatif | Lolos otomatis |
| Responsif | Bukti terdahulu pada 390, 768, 1366, 1920 px | Tidak diulang pada putaran ini |
| Mode live | X API resmi | Belum diuji karena memerlukan credential resmi |
| PostgreSQL | Jalur full-text dan deployment | Tidak diuji pada putaran ini |
| PDF | Status dan tipe konten | Isi/layout PDF belum diuji visual secara otomatis |
| Usability manusia | 5 tugas dan kuesioner SUS | Belum ada peserta nyata |

## 4. Inkonsistensi dokumentasi

1. `README.md` dan `docs/testing_report.md` masih memiliki judul bagian
   "Frontend (38 pengujian)", sedangkan tabel dan hasil aktual berjumlah 43.
2. Klaim aksesibilitas kadang ditulis sebagai 9 halaman dan kadang "8 halaman +
   5 uji manual". Yang tepat perlu dibedakan: sembilan halaman yang diaudit
   mencakup halaman login dan delapan halaman dashboard; lima pemeriksaan
   interaksi adalah tambahan, bukan halaman.
3. Endpoint metodologi menyatakan tidak ada pengumpulan data pribadi, tetapi jalur
   impor CSV/JSON masih menerima dan menyimpan `author_public_id`. Connector X
   resmi memang mengosongkannya, tetapi klaim global tersebut belum benar untuk
   data impor.
4. Dokumentasi menyebut alur insight wajib `draft -> reviewed -> approved`, tetapi
   API belum mewajibkan urutan tersebut dan laporan dapat memakai insight yang
   masih draft.

## 5. Temuan risiko dan rekomendasi

### Prioritas tinggi — wajib sebelum produksi

| Temuan | Dampak | Bukti implementasi | Rekomendasi |
| --- | --- | --- | --- |
| Workflow persetujuan tidak ditegakkan | Draft atau insight yang belum diverifikasi dapat masuk dan diekspor dalam laporan | `InsightIn` menerima status apa pun; update dapat melompat status; `create_report` hanya memeriksa keberadaan ID | Paksa insight baru menjadi `draft`, validasi transisi, wajibkan status `approved` saat membuat/mengekspor laporan, dan simpan identitas serta waktu reviewer |
| Otorisasi kepemilikan tidak konsisten | Analyst dapat mengubah/menghapus query, monitor, atau laporan milik analyst lain | Pemeriksaan owner ada pada insight, belum ada pada query/monitor/report | Terapkan aturan owner-or-admin pada mutasi; tambah tes dua akun analyst |
| Konfigurasi development tetap dapat dipakai di produksi | Secret/default password lemah atau akun demo dapat tetap aktif | Default `JWT_SECRET` dan `DEMO_PASSWORD` diterima; endpoint demo disembunyikan, tetapi akun demo tidak otomatis dinonaktifkan | Gagalkan startup produksi bila secret/default password masih bawaan; nonaktifkan akun demo; batasi endpoint seed hanya untuk environment demo |
| Sinkronisasi penghapusan dari sumber belum berjalan | Post nyata yang dihapus penulisnya di X tetap tersimpan sampai masa retensi habis | Job retensi sudah berjalan (`app/retention.py`: post tidak relevan dihapus permanen 14 hari setelah masuk, post relevan tepat 90 hari, tercatat di audit log). Pengecekan apakah post masih ada di X belum dibuat | Tambah pengecekan berkala status post di sumber dan catat legal basis sebelum mode live |

### Prioritas menengah

| Temuan | Dampak | Rekomendasi |
| --- | --- | --- |
| Token disimpan di `localStorage` | Dampak XSS menjadi lebih besar | Untuk produksi gunakan cookie `HttpOnly`, `Secure`, `SameSite`, CSP ketat, dan rotasi token |
| Login tanpa rate limit/lockout | Rentan brute force | Tambahkan rate limit per IP+akun, jeda progresif, dan alert percobaan gagal |
| Token tidak dapat dicabut di server | Logout hanya menghapus token di browser hingga token kedaluwarsa | Tambahkan sesi/revocation atau access token singkat + refresh token |
| `author_public_id` dapat diimpor | Berlawanan dengan klaim minimalisasi identitas | Tolak/hapus kolom tersebut untuk data nyata kecuali ada kebutuhan dan dasar hukum yang disetujui |
| E2E belum menguji isolation antarpemilik | Celah otorisasi objek tidak terdeteksi | Tambahkan dua akun analyst dan uji akses silang |
| Runner E2E menggantung saat teardown | CI dapat timeout walau tes selesai | Audit proses `next dev`/Playwright dan gunakan shutdown yang eksplisit di CI |
| Usability hanya otomatis | Belum membuktikan kemudahan bagi staf HR nyata | Jalankan 5–8 peserta, catat task success, time-on-task, error, SUS, dan relevansi hasil |

### Prioritas rendah / hygiene

- Jangan version-control `tsconfig.tsbuildinfo`; artefak incremental ini mudah
  berubah hanya karena type-check/build.
- Selaraskan seluruh angka tes dan tanggal laporan setelah setiap rilis.
- Tambahkan pemeriksaan visual isi PDF, bukan hanya status HTTP dan MIME type.
- Tambahkan CI untuk mode PostgreSQL agar jalur pencarian produksi tidak hanya
  diuji manual.

## 6. Peraturan penggunaan dashboard

Peraturan berikut berlaku untuk demo, uji pengguna, dan produksi. Aturan yang
ditandai **wajib ditegakkan sistem** tidak cukup hanya ditulis sebagai SOP.

### A. Tujuan penggunaan

1. Dashboard hanya digunakan untuk memahami pola agregat percakapan publik dan
   memperbaiki komunikasi rekrutmen.
2. Dashboard dilarang menjadi dasar menerima, menolak, memeringkat, atau menilai
   kelayakan individu.
3. Dilarang mencari, menandai, atau menggabungkan data berdasarkan nama pengguna,
   identitas personal, agama, suku, gender, kesehatan, politik, orientasi seksual,
   atau kondisi ekonomi.
4. Volume, sentimen, engagement, dan topik adalah indikator eksplorasi, bukan
   fakta tunggal. Setiap kesimpulan harus memuat konteks periode, filter, sumber,
   ukuran data, dan keterbatasan.

### B. Hak akses

| Role | Boleh | Tidak boleh |
| --- | --- | --- |
| Viewer | Membaca dashboard, post yang diizinkan, metodologi, dan laporan yang telah disetujui | Membuat/mengubah/menghapus data, mengekspor post-level, melihat audit log |
| Analyst | Hak viewer; membuat query/monitor milik sendiri; membuat dan meninjau insight; menyusun laporan | Mengubah objek milik analyst lain, mengelola sumber data/taxonomy, menyetujui temuannya sendiri tanpa reviewer kedua |
| Admin | Mengelola sumber data, taxonomy, koreksi label, audit, dan pemulihan operasional | Mengubah bukti atau status tanpa jejak audit; memakai seed/reset pada data produksi |

Ketentuan akun:

- Satu akun hanya untuk satu orang; akun dan password tidak boleh dibagikan.
- Gunakan hak akses minimum dan tinjau akses sedikitnya setiap tiga bulan.
- Akun pegawai yang pindah peran atau keluar harus dinonaktifkan paling lambat
  satu hari kerja.
- Akun demo dilarang aktif di produksi.

### C. Data dan privasi

1. Sumber data nyata hanya boleh berasal dari X API resmi atau ekspor yang
   mempunyai izin/dasar hukum; scraping dilarang.
2. Impor harus melalui admin dan lolos pemeriksaan asal, kolom, ukuran, duplikasi,
   dan penanda sintetis/nyata.
3. `author_public_id` tidak boleh diimpor untuk data nyata. Bila tidak dapat
   dihindari karena kebutuhan yang disetujui, nilainya harus dipseudonimkan,
   aksesnya dibatasi, dan masa simpannya didokumentasikan.
4. Raw post nyata disimpan maksimal **90 hari**; agregat tanpa identitas dapat
   disimpan **12 bulan** untuk evaluasi tren. Pengecualian memerlukan persetujuan
   pemilik data dan fungsi legal/privasi.
5. Penghapusan dari sumber harus disinkronkan paling lambat 24 jam setelah
   terdeteksi. Backup mengikuti masa retensi yang sama atau mempunyai prosedur
   purge terverifikasi.
6. Data sintetis dan nyata tidak boleh dicampur tanpa label eksplisit. Jika satu
   hasil memuat data sintetis, laporan tetap diberi watermark data sintetis.

### D. Analisis dan pelaporan

1. Insight selalu dibuat sebagai `draft`.
2. Reviewer manusia memeriksa minimal: filter, periode, jumlah data, tiga contoh
   konteks, potensi salah label, dan keterbatasan representasi.
3. Status harus berurutan `draft -> reviewed -> approved`; lompatan status
   dilarang. Untuk laporan eksternal/internal resmi, reviewer harus berbeda dari
   pembuat insight.
4. Hanya insight `approved` yang boleh masuk laporan final atau diekspor.
5. Item berlabel `Tidak Yakin` atau `needs_review` tidak boleh dipakai sebagai
   bukti utama sebelum dikoreksi admin.
6. Laporan wajib menampilkan periode, filter, sumber data, waktu pembaruan, versi
   model, penulis, reviewer, dan disclaimer bahwa dashboard bukan alat seleksi.
7. Ekspor default harus agregat. Ekspor post-level dibatasi maksimal 200 referensi
   berupa Post ID, waktu, topik, jenis pekerjaan, dan tautan—tanpa teks dan tanpa
   identitas penulis.

### E. Operasional dan keamanan

1. Produksi wajib memakai HTTPS, database terkelola, backup harian, secret unik
   minimal 32 karakter, origin CORS spesifik, dan jaringan internal/VPN bila ada.
2. Badge "data mungkin belum terbarui" berarti analisis tidak boleh dipakai untuk
   keputusan komunikasi mendesak sampai data diperbarui atau keterlambatan dicatat.
   Ambang sistem saat ini adalah 24 jam.
3. Seed/reset, re-analysis massal, perubahan taxonomy, impor, koreksi label,
   persetujuan, penghapusan, dan ekspor harus tercatat di audit log.
4. Audit log ditinjau mingguan; kejadian akses tidak sah atau ekspor tidak wajar
   dievaluasi pada hari kerja yang sama.
5. Perubahan taxonomy/model harus diuji pada sampel berlabel sebelum re-analysis
   massal dan dicatat sebagai versi baru.
6. Sebelum rilis: pytest, Vitest, type-check, lint, build, E2E, PostgreSQL, dan
   pemeriksaan visual PDF harus lolos.

## 7. Kriteria penerimaan produksi

Produksi hanya boleh disetujui bila seluruh butir berikut terpenuhi:

- [ ] Empat temuan prioritas tinggi telah diperbaiki dan memiliki regression test.
- [ ] Secret produksi tervalidasi saat startup dan seluruh akun demo nonaktif.
- [ ] Policy retensi, legal basis, serta sinkronisasi penghapusan disetujui.
- [ ] Role dan kepemilikan objek diuji dengan sedikitnya dua akun analyst.
- [ ] Laporan hanya menerima insight approved dan menyimpan reviewer/timestamp.
- [ ] Jalur PostgreSQL, backup-restore, dan mode live diuji di staging.
- [ ] Usability test dengan 5–8 staf HR mencapai task success minimal 80%, SUS
      minimal 68, dan kesadaran data sintetis 100%.
- [ ] Penanggung jawab produk, data, keamanan, dan persetujuan laporan ditetapkan.

## 8. Prioritas pekerjaan berikutnya

1. Tegakkan workflow approval dan owner-or-admin di backend, lalu tambah tes API.
2. Tambahkan production safety checks serta nonaktifkan akun/endpoint demo.
3. Hilangkan `author_public_id` dari jalur impor nyata dan implementasikan retensi.
4. Perbaiki teardown E2E dan aktifkan pipeline CI PostgreSQL + PDF visual check.
5. Jalankan usability test nyata; setelah itu perbarui status produk berdasarkan
   data peserta, bukan hasil automation saja.
