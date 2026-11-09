# Skrip Usability Testing TalentPulse

## 1. Tujuan

Menguji apakah staf Recruitment/HR dapat menemukan isu percakapan pencari kerja,
membandingkannya antar periode dan jenis pekerjaan, lalu menyusun bahan
komunikasi — dengan langkah lebih sedikit dibanding pencarian manual di media
sosial.

## 2. Peserta

- 5–8 peserta: staf Recruitment, HR, Recruitment Marketing, Employer Branding,
  atau Corporate Communication yang mendukung rekrutmen.
- Kemampuan teknis menengah; tidak perlu latar belakang analisis data.
- Perangkat: laptop kantor, resolusi 1366×768 atau 1920×1080, browser Chrome/Edge.

## 3. Persiapan fasilitator

1. Jalankan aplikasi dan pastikan dataset demo terisi:
   `docker compose exec backend python -m app.seed --reset`.
2. Login dengan akun `dimas@talentpulse.local`.
3. Reset filter ke bawaan sebelum setiap peserta.
4. Siapkan pencatatan: waktu per tugas, jumlah langkah, jumlah kesalahan.
5. Sampaikan bahwa **data bersifat sintetis** dan yang diuji adalah produk,
   bukan peserta.

Naskah pembuka (dibacakan):

> "Terima kasih sudah meluangkan waktu. Ini prototipe dashboard internal untuk
> membaca percakapan publik pencari kerja. Seluruh datanya buatan, jadi angkanya
> tidak menggambarkan kondisi nyata. Saya akan memberi lima tugas. Kerjakan
> seperti biasa dan ceritakan apa yang Anda pikirkan sambil mengerjakan. Kalau
> ada yang membingungkan, itu masukan berharga bagi kami."

## 4. Tugas

### Tugas 1 — Menemukan topik dominan (target ≤ 2 menit)

> "Temukan tiga topik yang paling banyak dibicarakan mengenai pekerjaan **staf
> gudang** selama 30 hari terakhir."

Jalur ideal: filter Jenis pekerjaan → "Staf Gudang" → Overview / Eksplorasi Topik.
Sukses bila peserta menyebut tiga topik teratas beserta jumlah post.

### Tugas 2 — Menemukan pertanyaan berulang (target ≤ 3 menit)

> "Temukan pertanyaan yang paling sering muncul mengenai **sistem shift**, lalu
> buka tiga post yang mewakili."

Jalur ideal: topik "Sistem Shift dan Jam Kerja" → daftar pertanyaan → detail post.
Sukses bila tiga post dibuka melalui panel detail tanpa kehilangan filter.

### Tugas 3 — Membandingkan sentimen (target ≤ 3 menit)

> "Bandingkan sentimen percakapan mengenai pekerjaan **administrasi** dan
> **SPG/SPB**."

Jalur ideal: Overview → grafik sentimen per jenis pekerjaan, atau Analisis Tren
dengan breakdown sentimen. Sukses bila peserta menyebut perbedaan porsi negatif.

### Tugas 4 — Monitoring (target ≤ 3 menit)

> "Simpan monitoring untuk **penipuan lowongan**, lalu bandingkan dua periode."

Jalur ideal: Monitoring → Monitor baru → isi kata kunci → baca
perubahan 7 hari. Sukses bila monitor tersimpan dan arah tren terbaca.

### Tugas 5 — Menyusun laporan (target ≤ 5 menit)

> "Buat laporan insight yang memuat dua grafik dan tiga temuan."

Jalur ideal: Laporan Insight → "Saran dari data" → simpan tiga draft → tinjau →
"Susun laporan" pilih dua grafik → pratinjau/ekspor. Sukses bila laporan tersimpan
dan peserta menyadari label "Rekomendasi untuk Ditinjau".

## 5. Metrik yang dicatat

| Metrik | Cara pengambilan |
| --- | --- |
| Task success rate | Observasi fasilitator (berhasil / berhasil dengan bantuan / gagal) |
| Time on task | Stopwatch, dicocokkan dengan log `duration_ms` |
| Error count | Jumlah jalan buntu, salah halaman, atau salah filter |
| Navigation steps | Jumlah perpindahan halaman/klik utama (`step_count`) |
| Filter usage | Nama filter yang dipakai (`filter_keys`) — **nilai filter tidak dicatat** |
| SUS | Kuesioner 10 pernyataan setelah seluruh tugas |
| Search relevance | Penilaian relevan/tidak untuk 5 hasil teratas pada Tugas 2 |

Instrumentasi aplikasi: `POST /usability/events` menyimpan `session_key`,
`task_code`, `event_type`, `step_count`, `duration_ms`, dan `filter_keys` saja.
Isi pencarian, teks post, dan credential tidak pernah dikirim. Rekap tersedia di
halaman Metodologi & Etika bagi admin.

## 6. Kuesioner System Usability Scale (SUS)

Instrumen: *System Usability Scale* (Brooke, 1996), 10 butir, skala Likert 1–5,
dialihbahasakan ke bahasa Indonesia. Butir ganjil bernada positif, butir genap
bernada negatif; susunan berselang-seling ini bagian dari instrumen asli dan
**tidak boleh diubah urutannya**.

### 6.1 Cara pemberian

1. Berikan kuesioner **segera setelah Tugas 5**, sebelum wawancara penutup, agar
   jawaban tidak dipengaruhi diskusi.
2. Minta peserta menjawab cepat berdasarkan kesan pertama; jangan membahas
   butir satu per satu.
3. Semua butir wajib dijawab. Bila peserta ragu, minta memilih angka 3.
4. Fasilitator tidak menjelaskan arti butir di luar teks yang tertulis.

### 6.2 Lembar jawaban

**Petunjuk untuk peserta:** Lingkari satu angka pada setiap pernyataan sesuai
pengalaman Anda memakai dasbor TalentPulse barusan.
1 = Sangat tidak setuju · 2 = Tidak setuju · 3 = Netral · 4 = Setuju · 5 = Sangat setuju

| No | Pernyataan | 1 | 2 | 3 | 4 | 5 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Saya rasa saya akan sering menggunakan dasbor ini. | ○ | ○ | ○ | ○ | ○ |
| 2 | Saya merasa dasbor ini terlalu rumit tanpa alasan yang jelas. | ○ | ○ | ○ | ○ | ○ |
| 3 | Saya merasa dasbor ini mudah digunakan. | ○ | ○ | ○ | ○ | ○ |
| 4 | Saya rasa saya membutuhkan bantuan orang teknis untuk dapat menggunakan dasbor ini. | ○ | ○ | ○ | ○ | ○ |
| 5 | Saya merasa berbagai fungsi dalam dasbor ini terpadu dengan baik. | ○ | ○ | ○ | ○ | ○ |
| 6 | Saya merasa terlalu banyak hal yang tidak konsisten dalam dasbor ini. | ○ | ○ | ○ | ○ | ○ |
| 7 | Saya rasa kebanyakan orang akan cepat belajar menggunakan dasbor ini. | ○ | ○ | ○ | ○ | ○ |
| 8 | Saya merasa dasbor ini sangat merepotkan untuk digunakan. | ○ | ○ | ○ | ○ | ○ |
| 9 | Saya merasa sangat percaya diri ketika menggunakan dasbor ini. | ○ | ○ | ○ | ○ | ○ |
| 10 | Saya perlu mempelajari banyak hal sebelum dapat menggunakan dasbor ini. | ○ | ○ | ○ | ○ | ○ |

Kode peserta: ________ Peran: ________ Tanggal: ________

### 6.3 Penghitungan skor

1. Butir ganjil (1, 3, 5, 7, 9): kontribusi = nilai jawaban − 1.
2. Butir genap (2, 4, 6, 8, 10): kontribusi = 5 − nilai jawaban.
3. Jumlahkan kesepuluh kontribusi (rentang 0–40).
4. Skor SUS = jumlah kontribusi × 2,5 (rentang 0–100).

Contoh: jawaban 4, 2, 4, 1, 4, 2, 5, 2, 4, 2 menghasilkan kontribusi
3 + 3 + 3 + 4 + 3 + 3 + 4 + 3 + 3 + 3 = 32, sehingga skor SUS = 32 × 2,5 = **80**.

Skor SUS **bukan persentase**. Laporkan skor per peserta, rata-rata, dan simpangan
baku; dengan peserta sedikit, cantumkan juga nilai minimum dan maksimum.

### 6.4 Tabel rekap

| Peserta | B1 | B2 | B3 | B4 | B5 | B6 | B7 | B8 | B9 | B10 | Jumlah kontribusi | Skor SUS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P1 | | | | | | | | | | | | |
| P2 | | | | | | | | | | | | |
| P3 | | | | | | | | | | | | |
| P4 | | | | | | | | | | | | |
| P5 | | | | | | | | | | | | |
| **Rata-rata** | | | | | | | | | | | | |

Isi kolom B1–B10 dengan **nilai jawaban mentah** (1–5); kontribusi dihitung pada
kolom "Jumlah kontribusi" sesuai aturan 6.3.

### 6.5 Interpretasi

Skor rata-rata ≥ 68 dibaca sebagai kebergunaan di atas rata-rata (lihat ambang
pada bagian 8). Skor di bawah 68 tidak otomatis berarti gagal; telusuri tugas dan
butir mana yang menurunkan skor, lalu kaitkan dengan temuan observasi dan
wawancara penutup.

## 7. Wawancara penutup

1. Bagian mana yang paling membantu pekerjaan Anda sehari-hari?
2. Angka mana yang tadi sempat membingungkan? Apa yang Anda kira artinya?
3. Bila harus menjelaskan temuan ini ke atasan, apa yang masih kurang?
4. Dibanding cara Anda mencari informasi sekarang, mana yang lebih cepat?
5. Apakah ada yang membuat Anda ragu terhadap keakuratan data?
6. Fitur apa yang paling Anda inginkan berikutnya?

## 8. Ambang keberhasilan

| Indikator | Target |
| --- | --- |
| Task success rate | ≥ 80% tanpa bantuan untuk Tugas 1–4 |
| Time on task | Sesuai target masing-masing tugas |
| SUS | ≥ 68 (rata-rata industri) |
| Search relevance | ≥ 3 dari 5 hasil teratas dinilai relevan |
| Kesadaran data sintetis | 100% peserta menyadari data bersifat demo |
