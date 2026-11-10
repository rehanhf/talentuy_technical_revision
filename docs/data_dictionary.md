# Data Dictionary (Ringkas)

Dokumen ini merangkum elemen data yang relevan setelah kebijakan akses
berbasis aturan (tanpa role gate UI/API) diterapkan.

## 1) Insight

### Tabel `insights`

- `id` (string): ID insight.
- `title` (string): judul insight.
- `summary` (text): ringkasan insight.
- `human_note` (text): catatan peninjau manusia.
- `evidence_filters` (json): snapshot filter bukti.
- `metric_snapshot` (json): snapshot metrik saat insight dibuat.
- `review_comment` (text, bawaan `""`): komentar peninjau. Bukan isi insight:
  tidak mengubah `last_edited_by`, tidak menggugurkan persetujuan, dan tidak
  pernah masuk ke pratinjau atau ekspor laporan. Penulisnya tercatat di audit log.
- `created_by` (string | null): ID pengguna pembuat insight.
- `last_edited_by` (string | null): ID pengguna yang terakhir mengubah isi insight.
- `first_approved_at` (datetime | null): waktu persetujuan pertama. Tidak pernah
  dikosongkan, termasuk saat persetujuan ditarik atau isi diubah.
- `human_status` (`draft` | `reviewed` | `approved`): status peninjauan insight.
- `is_synthetic_data` (boolean): penanda data demo/live saat insight dibuat.
- `created_at`, `updated_at` (datetime): waktu pencatatan.

### Aturan bisnis insight

1. Pembuat (`created_by`) dan penyunting isi terakhir (`last_edited_by`) **tidak
   boleh** menyetujui insight (HTTP 403). Insight juga tidak dapat dibuat
   langsung berstatus `approved` (HTTP 403).
2. Isi (`title`, `summary`, `human_note`, `evidence_filters`,
   `metric_snapshot`) dan persetujuan diubah dalam dua permintaan terpisah;
   keduanya dalam satu permintaan ditolak (HTTP 422). Mengirim nilai yang sama
   tidak dihitung sebagai perubahan isi.
3. Perubahan isi insight yang sudah `approved` mengembalikan status ke `draft`
   dan mencatat pengubahnya di `last_edited_by`.
4. Persetujuan boleh ditarik (status kembali ke `draft` atau `reviewed`), tetapi
   insight yang pernah disetujui (`first_approved_at` terisi) tidak dapat dihapus
   (HTTP 409).
5. Audit log `insight.update` menyimpan `changes`, nilai isi sebelumnya
   (`before`), dan bila hasilnya `approved`, salinan utuh isi yang disetujui
   (`approved_snapshot`).

Catatan: `human_note` termasuk isi dan ikut diekspor. Pengguna yang mengubahnya
menjadi penyunting terakhir dan tidak dapat menyetujui insight tersebut. Peninjau
yang ingin berkomentar tanpa kehilangan hak menyetujui memakai `review_comment`.

## 2) Post Analysis Confidence

Pada response `PostOut`, field confidence selalu ditampilkan untuk semua
pengguna yang sudah login:

- `sentiment_confidence` (float | null)
- `intent_confidence` (float | null)
- `model_version` (string | null)

## 3) Connector / System Ops Metadata

Endpoint `GET /data/connectors` menambahkan:

- `system_ops_enabled` (boolean): status flag environment
  `ENABLE_SYSTEM_OPS`.

Flag ini dipakai untuk mengontrol operasi sistem skala global:

- `POST /data/seed`
- `POST /data/reanalyze`

Saat flag `false`, endpoint di atas mengembalikan HTTP 403.

## 4) Role Column

Kolom `users.role` tetap ada untuk kompatibilitas data dan profil akun,
namun tidak lagi dipakai sebagai kontrol akses endpoint/UI dan tidak ditampilkan di antarmuka.
Autentikasi tetap wajib melalui login JWT (`get_current_user`).
