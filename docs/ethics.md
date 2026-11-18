# Etika, Privasi, dan Kepatuhan

## 1. Posisi produk

TalentPulse adalah **media informasi pendukung komunikasi rekrutmen**. Produk ini
bukan sistem seleksi, bukan alat penilaian kandidat, dan tidak menghasilkan
rekomendasi menerima atau menolak seseorang.

Subjek data adalah pengguna X yang membuat post publik. Mereka bukan pengguna
dashboard, tidak diprofilkan, dan tidak diberi skor apa pun.

## 2. Aturan yang mengikat implementasi

| No | Aturan | Wujud di produk |
| --- | --- | --- |
| 1 | Hanya data publik jalur resmi atau data sintetis | `MockXConnector` (demo) dan `OfficialXConnector` (X API); tidak ada scraping |
| 2 | Tidak melakukan profiling kandidat | Tidak ada halaman/endpoint per individu; agregasi minimal per topik dan pekerjaan |
| 3 | Tidak menginferensi atribut sensitif | Taxonomy hanya memuat topik pekerjaan; tidak ada label agama, suku, gender, kesehatan, politik, orientasi seksual, atau kondisi ekonomi |
| 4 | Bukan dasar keputusan ketenagakerjaan | Disclaimer pada sidebar, halaman Metodologi, dan setiap laporan |
| 5 | Tidak ada pencarian berbasis identitas | Pencarian hanya menyentuh teks ternormalisasi; kolom author tidak dapat difilter |
| 6 | Minimalkan tampilan identitas | Hanya `external_post_id` dan tautan post; `author_public_id` tidak ditampilkan. Setiap @handle di teks post diganti `@pengguna` sebelum disimpan (token seragam, karena mention tidak dianalisis) |
| 7 | Hormati penghapusan post | Kolom `deleted_at`; post terhapus dikecualikan dari seluruh query. Job retensi (`app/retention.py`) menghapus permanen post nyata yang tidak relevan 14 hari setelah masuk dan post relevan tepat 90 hari setelah masuk |
| 8 | Batasi ekspor data mentah | Ekspor default agregat; ekspor post-level hanya Post ID, waktu, topik, pekerjaan, tautan |
| 9 | Tampilkan sumber, periode, metode, keterbatasan | Blok `meta` pada setiap response + halaman Metodologi & Etika |
| 10 | Tidak mengklaim afiliasi dengan X | Tidak ada logo/nama X sebagai partner; disclaimer tetap pada sidebar |
| 11 | Audit log | `audit_logs` mencatat impor, analisis ulang, perubahan taxonomy, koreksi label (nilai sebelum dan sesudah), insight, ekspor laporan, dan setiap putaran retensi yang menghapus data |
| 12 | Credential hanya di server | `X_API_BEARER_TOKEN` dibaca `app/config.py`; tidak ada variabel `NEXT_PUBLIC_*` berisi rahasia |

## 3. Data sintetis

Dataset demo dibangkitkan `MockXConnector` dengan `random_state` tetap sehingga
dapat direproduksi. Setiap post ditandai `is_synthetic = true`.

Penanda yang wajib terlihat pengguna:

- badge `DATA DEMO` pada top bar;
- kalimat pengingat pada sidebar;
- watermark `DATA SINTETIS — BUKAN TEMUAN AKTUAL` pada pratinjau dan ekspor laporan;
- `is_synthetic_data` pada setiap insight yang dibuat saat mode demo.

## 4. Human-in-the-loop

Ringkasan otomatis berhenti pada status **draft** dan diberi label
"Rekomendasi untuk Ditinjau". Alur wajib: draft → sudah ditinjau → disetujui,
dengan catatan peninjau yang ikut tercetak pada laporan. Label NLP yang keyakinannya
rendah diberi sentimen `Tidak Yakin` dan ditandai `needs_review`, lalu dapat
dikoreksi admin — koreksi tercatat pada audit log dan menandai versi model.

## 5. Keterbatasan yang dinyatakan di produk

1. Percakapan di X tidak mewakili seluruh populasi pencari kerja.
2. Sentimen otomatis dapat salah memahami slang, sarkasme, dan konteks lokal.
3. Volume percakapan bukan ukuran langsung kebutuhan tenaga kerja.
4. Engagement tinggi tidak selalu berarti informasi paling benar.
5. Data demo bersifat sintetis dan tidak boleh dibaca sebagai kondisi aktual.
6. Dashboard mendukung eksplorasi informasi, bukan keputusan rekrutmen individu.
7. Setiap insight harus diverifikasi manusia sebelum digunakan.

Daftar yang sama dilayani endpoint `/methodology` sehingga tidak ada versi
keterbatasan yang berbeda antara dokumen dan aplikasi.

## 6. Sebelum dipakai dengan data nyata

- [ ] Perjanjian dan dasar hukum akses X API resmi tersedia.
- [x] Kebijakan retensi data ditetapkan dan dijalankan otomatis: post nyata yang tidak lolos filter relevansi dihapus 14 hari setelah masuk, post relevan dihapus tepat 90 hari setelah masuk (dapat disetel lewat `RETENTION_*`).
- [ ] Proses menghormati penghapusan post dari sumber dijadwalkan.
- [ ] `JWT_SECRET` dan password akun diganti dari nilai development.
- [ ] Akun demo dinonaktifkan.
- [ ] Persetujuan penggunaan nama dan logo mitra diperoleh.
- [ ] Peninjauan etika internal terhadap daftar taxonomy dilakukan.
- [ ] Pengguna dashboard dibekali panduan membaca angka dan keterbatasannya.
