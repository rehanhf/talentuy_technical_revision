/**
 * Template Keyword untuk "Tarik data X".
 *
 * Templat hanya mengisi kotak kueri; pengguna tetap menekan "Tarik data" sendiri
 * karena setiap pencarian memakai kredit provider. Daftar ini sengaja berupa
 * konstanta frontend, terpisah dari tabel keyword_presets yang dipakai untuk
 * mencari post yang sudah tersimpan.
 *
 * Kueri memakai frasa yang ditulis pekerja, bukan kata tunggal: "lewat yayasan"
 * hampir selalu berarti penyalur kerja, sedangkan "yayasan" saja juga cocok
 * dengan yayasan amal.
 */

export interface FetchTemplate {
  name: string;
  /** Satu baris tentang apa yang dicari, tampil sebelum pengguna menarik data. */
  description: string;
  query: string;
}

export const FETCH_TEMPLATES: readonly FetchTemplate[] = [
  {
    name: "Kerja alih daya (umum)",
    description:
      "Percakapan umum tentang bekerja lewat perusahaan alih daya, tanpa iklan lowongan.",
    query:
      '("kerja outsourcing" OR "karyawan outsourcing" OR "anak outsource" OR "lewat yayasan" OR "kerja yayasan" OR "alih daya") -lowongan -loker',
  },
  {
    name: "Upah dan potongan",
    description: "Gaji di bawah upah minimum, potongan gaji, dan gaji terlambat.",
    query:
      '"dibawah umr" OR "di bawah umr" OR "dibawah umk" OR "potong gaji" OR "gaji dipotong" OR "gaji telat" OR "telat gajian" OR "gaji belum cair"',
  },
  {
    name: "BPJS dan administrasi",
    description: "Slip gaji, BPJS, JMO, dan surat keterangan kerja (paklaring).",
    query:
      '("slip gaji" OR "bpjs ketenagakerjaan" OR jmo OR paklaring OR "bpjs belum aktif" OR "bpjs ga aktif") -pinjol',
  },
  {
    name: "Kontrak dan penempatan",
    description: "Kontrak habis atau tidak diperpanjang, serta masalah penempatan kerja.",
    query:
      '"habis kontrak" OR "kontrak diputus" OR "ga diperpanjang" OR "tidak diperpanjang" OR pkwt OR "dipindah penempatan" OR "penempatan jauh"',
  },
  {
    name: "Rekrutmen bermasalah",
    description: "Biaya rekrutmen yang dibebankan ke pelamar dan lowongan palsu.",
    query:
      '"bayar seragam" OR "uang seragam" OR "biaya admin kerja" OR "loker palsu" OR "yayasan minta uang" OR "penipuan loker"',
  },
];

/** Batas panjang kueri pada endpoint POST /data/fetch-live. */
export const FETCH_QUERY_MAX_LENGTH = 300;
