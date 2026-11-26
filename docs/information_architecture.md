# Information Architecture TalentPulse

## 1. Sistem organisasi

Informasi disusun menurut **pertanyaan kerja** tim Recruitment/HR, bukan menurut
struktur tabel basis data.

| Pertanyaan pengguna | Halaman |
| --- | --- |
| "Apa yang sedang ramai dibicarakan?" | Overview (`/ringkasan`) |
| "Apakah naik atau turun dibanding periode lalu?" | Analisis Tren (`/tren`) |
| "Isu apa saja yang muncul dan seputar apa?" | Eksplorasi Topik (`/topik`) |
| "Apa yang sebenarnya mereka tulis?" | Pencarian Post (`/post`) |
| "Bagaimana isu ini berkembang minggu depan?" | Monitoring (`/monitoring`) |
| "Apa yang saya laporkan ke atasan?" | Laporan Insight (`/laporan`) |
| "Dari mana datanya dan seberapa bisa dipercaya?" | Data & Pengaturan (`/data`), Metodologi & Etika (`/metodologi`) |

## 2. Sistem navigasi

**Sidebar (navigasi utama)** — delapan tujuan dengan label Bahasa Indonesia,
ikon pendukung, dan status aktif; dapat diciutkan menjadi ikon saja.

**Top bar (navigasi global)**

- logo teks TalentPulse (bukan logo perusahaan sampai aset resmi tersedia);
- pencarian global (Ctrl/⌘ + K) berisi preset topik dan lompatan antar halaman;
- badge mode data `DATA DEMO` / `DATA LIVE`;
- label periode aktif;
- tombol reset filter yang muncul saat ada filter aktif;
- menu profil: "Cara membaca dashboard" dan keluar;
- baris meta: waktu pembaruan, penanda data usang, versi model, provider pencarian.

**Panel filter** menetap di sisi kanan pada layar ≥1280 px dan menjadi drawer
pada layar lebih kecil sehingga konteks filter selalu terlihat.

## 3. Sistem label

| Konsep teknis | Label antarmuka |
| --- | --- |
| Post volume | Jumlah post |
| Sentiment | Sentimen (Positif / Netral / Negatif / Tidak Yakin) |
| Intent | Kategori: Pertanyaan, Keluhan, Pengalaman, Informasi Lowongan, Promosi, Peringatan Penipuan |
| Job role | Jenis pekerjaan |
| Engagement score | Skor interaksi |
| Peak detection | Lonjakan percakapan |
| Saved query / monitor | Monitoring |
| Insight status | Rekomendasi untuk Ditinjau → Sudah ditinjau → Disetujui |

Angka yang tidak dapat dibandingkan ditulis **"Tidak dapat dibandingkan"**, bukan
0%, agar tidak menimbulkan kesimpulan palsu.

## 4. Sistem pencarian dan filter

Filter global berlaku untuk seluruh halaman:

`rentang tanggal`, `query/monitor tersimpan`, `jenis pekerjaan`, `topik`,
`sentimen`, `kategori intent`, `rentang engagement`, `bahasa`, `kata kunci`.

Perilaku:

- cross-filter: klik pada grafik menambah filter, klik ulang melepasnya;
- debounce 280 ms sebelum permintaan API dikirim;
- filter aktif tampil sebagai chip yang dapat dilepas satu per satu;
- tersedia "Hapus semua filter";
- state penting tersimpan pada URL (`?date_from=…&topics=…`) sehingga tampilan
  dapat dibagikan secara internal dan tombol back tetap bermakna;
- hanya nilai yang berbeda dari default yang ditulis ke URL agar tautan pendek.

Operator pencarian: `AND`, `OR`, `-kata` untuk mengecualikan, dan tanda kutip
untuk frasa. Pencarian berbasis identitas personal tidak disediakan.

## 5. Pemetaan model Ellis

| Tahap | Implementasi |
| --- | --- |
| Starting | Preset topik dan contoh query pada pencarian global |
| Chaining | Kata kunci terkait, topik, dan jenis pekerjaan yang dapat diklik |
| Browsing | Overview, grafik tren, kartu topik |
| Differentiating | Filter global, pengurutan relevansi/waktu/engagement |
| Monitoring | Monitoring, perbandingan periode, indikator perubahan |
| Extracting | Detail post, catatan peninjau, laporan, ekspor agregat |

## 6. Information Foraging Theory

| Konsep | Penerapan |
| --- | --- |
| Information scent | Label eksplisit, cuplikan teks, jumlah post, perubahan persen, badge sentimen |
| Information patch | Pengelompokan menjadi topik, jenis pekerjaan, dan periode |
| Cost of information | Cross-filter, drill-down dalam drawer, filter yang bertahan antar halaman |
| Value of information | Skor perhatian: volume + momentum + porsi negatif |
| Navigation between patches | Grafik → topik → post → insight tanpa kehilangan filter |

## 7. Alur pengguna utama

**Flow A — Menemukan isu rekrutmen**
Overview → lihat lonjakan pada grafik volume → klik titik puncak (filter tanggal
menyempit) → buka topik dominan → baca post pertanyaan teratas → simpan sebagai
insight draft.

**Flow B — Menjawab pertanyaan bisnis**
Filter jenis pekerjaan "SPG/SPB" → Analisis Tren membandingkan dua periode →
Eksplorasi Topik melihat komposisi keluhan → susun laporan berisi grafik terpilih.

**Flow C — Monitoring**
Simpan query "Penipuan Lowongan" sebagai monitor → buka Monitoring →
baca perubahan 7 hari → "Buka di dashboard" untuk menelusuri penyebabnya.

## 8. Peta URL

| URL | Halaman | Akses |
| --- | --- | --- |
| `/masuk` | Login demo | publik |
| `/ringkasan` | Overview | viewer+ |
| `/tren` | Analisis Tren | viewer+ |
| `/topik` | Eksplorasi Topik | viewer+ |
| `/post` | Pencarian Post | viewer+ |
| `/monitoring` | Monitoring | viewer (baca), analyst+ (ubah) |
| `/laporan` | Laporan Insight | viewer (baca/ekspor), analyst+ (susun) |
| `/data` | Data & Pengaturan | viewer (baca), admin (impor/taxonomy/audit) |
| `/metodologi` | Metodologi & Etika | viewer+ |
