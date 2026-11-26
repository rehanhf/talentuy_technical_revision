"""Taxonomy awal: jenis pekerjaan, topik, intent, dan sentimen.

Semua label antarmuka menggunakan Bahasa Indonesia dan dapat dikelola ulang
oleh admin melalui halaman Data & Pengaturan.
"""

from __future__ import annotations

# Lima posisi yang benar-benar ditempatkan PT Siprama Cakrawala menurut wawancara
# dengan Head of HR, ditambah "Lainnya" sebagai penampung post yang jenis
# pekerjaannya di luar kelima posisi itu. Label memakai istilah perusahaan.
JOB_ROLE_CODES: dict[str, str] = {
    "salesman": "Salesman",
    "merchandiser": "Merchandiser",
    "spg_spb": "SPG/SPB",
    "staf_officer": "Staf Officer",
    "administrasi": "Administrasi",
}

JOB_ROLE_FALLBACK = "Lainnya"

JOB_ROLES: list[str] = [*JOB_ROLE_CODES.values(), JOB_ROLE_FALLBACK]

# Kata pemicu per label, dalam bahasa yang dipakai pekerja di unggahan (bukan
# istilah resmi). Dicocokkan sebagai kata utuh pada teks ternormalisasi
# (huruf kecil), boleh diikuti akhiran "-nya". "Lainnya" tidak punya pemicu:
# label itu dipakai bila tidak ada pemicu yang cocok.
# Sengaja tidak memuat "administrasi" saja: frasa "biaya administrasi" lazim
# pada unggahan penipuan lowongan dan bukan penanda jenis pekerjaan.
JOB_ROLE_TRIGGERS: dict[str, tuple[str, ...]] = {
    "Salesman": (
        "sales", "salesman", "sales lapangan", "sales motoris", "sales kanvas",
        "kanvaser", "canvasser", "taking order",
    ),
    "Merchandiser": (
        "merchandiser", "merchandising", "md", "display barang", "display produk",
        "susun barang", "isi rak",
    ),
    "SPG/SPB": ("spg", "spb", "sales promotion", "promotor", "penjaga stand"),
    "Staf Officer": (
        "officer", "staff officer", "staf officer", "staf kantor", "staff kantor",
        "office staff",
    ),
    "Administrasi": (
        "admin", "adm", "staf admin", "staff admin", "staf administrasi",
        "staff administrasi", "data entry", "input data",
    ),
}

# Pemetaan label lama (10 jenis pekerjaan) ke partisi 20 Oktober 2026, dipakai
# migration b7c2d9e4f1a0. Bersifat historis; jangan diubah.
LEGACY_JOB_ROLE_MAP: dict[str, str] = {
    "Sales Promotion Girl/Boy": "SPG/SPB",
    "Admin": "Administrasi",
    "Driver": "Pengemudi",
    "Staf Gudang": "Staf Gudang",
    "Merchandiser": JOB_ROLE_FALLBACK,
    "Operator": JOB_ROLE_FALLBACK,
    "Security": JOB_ROLE_FALLBACK,
    "Cleaning Service": JOB_ROLE_FALLBACK,
    "Supervisor Lapangan": JOB_ROLE_FALLBACK,
}

INTENTS: list[str] = [
    "Pertanyaan",
    "Keluhan",
    "Pengalaman",
    "Informasi Lowongan",
    "Promosi",
    "Peringatan Penipuan",
]

SENTIMENTS: list[str] = ["Positif", "Netral", "Negatif", "Tidak Yakin"]

LANGUAGES: list[str] = ["id", "en"]

# slug, nama, deskripsi, warna, keywords
TOPIC_SEED: list[tuple[str, str, str, str, list[str]]] = [
    (
        "gaji-benefit",
        "Gaji dan Benefit",
        "Percakapan mengenai besaran gaji, tunjangan, lembur, dan BPJS.",
        "#2563EB",
        [
            "gaji", "upah", "umr", "ump", "umk", "thr", "bonus", "tunjangan",
            "lembur", "bpjs", "slip gaji", "take home pay", "insentif", "uang makan",
        ],
    ),
    (
        "kontrak-status",
        "Kontrak dan Status Kerja",
        "Status karyawan kontrak, outsourcing, probation, dan perpanjangan.",
        "#7C3AED",
        [
            "kontrak", "pkwt", "outsourcing", "alih daya", "probation", "masa percobaan",
            "karyawan tetap", "perpanjangan", "putus kontrak", "status kerja", "yayasan",
        ],
    ),
    (
        "lokasi-penempatan",
        "Lokasi dan Penempatan",
        "Lokasi kerja, penempatan store, mutasi, dan jarak tempuh.",
        "#0891B2",
        [
            "penempatan", "lokasi", "ditempatkan", "store", "cabang", "mutasi",
            "luar kota", "mess", "jarak", "transport", "wilayah",
        ],
    ),
    (
        "shift-jam-kerja",
        "Sistem Shift dan Jam Kerja",
        "Pola shift, jam kerja, hari libur, dan rotasi jadwal.",
        "#F59E0B",
        [
            "shift", "sif", "jam kerja", "masuk pagi", "masuk malam", "rolling",
            "libur", "off", "jadwal", "overtime", "8 jam", "12 jam",
        ],
    ),
    (
        "persyaratan-pendidikan",
        "Persyaratan Pendidikan",
        "Syarat ijazah, jurusan, usia, dan batas minimal pendidikan.",
        "#DB2777",
        [
            "ijazah", "sma", "smk", "d3", "s1", "lulusan", "jurusan", "minimal pendidikan",
            "usia maksimal", "fresh graduate", "syarat", "tinggi badan",
        ],
    ),
    (
        "pengalaman-keahlian",
        "Pengalaman dan Keahlian",
        "Pengalaman kerja, sertifikasi, dan keahlian yang diminta.",
        "#059669",
        [
            "pengalaman", "sertifikat", "sim a", "sim b", "forklift", "excel",
            "skill", "keahlian", "pelatihan", "training", "kursus",
        ],
    ),
    (
        "proses-melamar",
        "Proses Melamar",
        "Alur lamaran, interview, psikotes, dan pengumuman hasil.",
        "#4F46E5",
        [
            "lamaran", "melamar", "interview", "wawancara", "psikotes", "tes",
            "panggilan", "berkas", "cv", "medical check", "pengumuman", "hrd",
        ],
    ),
    (
        "keamanan-penipuan",
        "Keamanan dan Penipuan Lowongan",
        "Indikasi lowongan palsu, pungutan biaya, dan modus penipuan.",
        "#DC2626",
        [
            "penipuan", "loker palsu", "lowongan palsu", "scam", "bayar",
            "pungli", "biaya administrasi", "modus", "waspada", "hati-hati", "tipu",
        ],
    ),
    (
        "pengalaman-kandidat",
        "Pengalaman Kandidat",
        "Cerita pelamar mengenai proses seleksi dan perlakuan yang diterima.",
        "#0EA5E9",
        [
            "ditolak", "diterima", "ghosting", "nunggu kabar", "dikabari",
            "pengalaman melamar", "ramah", "antre", "lama banget", "responsif",
        ],
    ),
    (
        "reputasi-perusahaan",
        "Reputasi Perusahaan Outsourcing",
        "Persepsi publik terhadap vendor penyalur dan perusahaan pengguna.",
        "#64748B",
        [
            "vendor", "penyalur", "perusahaan outsourcing", "reputasi", "review",
            "rekomendasi", "amanah", "bagus ga", "gimana kerjanya", "testimoni",
        ],
    ),
]

TOPIC_NAMES: list[str] = [t[1] for t in TOPIC_SEED]

# Preset kata kunci per kategori isu: wujud karakteristik *starting* (Ellis)
# berupa kueri terpandu. Ini hanya isi awal; admin menyuntingnya lewat Data &
# Pengaturan dan hasilnya tersimpan di tabel keyword_presets.
# slug topik -> [(label, query)]
KEYWORD_PRESET_SEED: dict[str, list[tuple[str, str]]] = {
    "gaji-benefit": [
        ("Gaji di bawah UMR", 'gaji OR umr OR umk OR "di bawah umr"'),
        ("Lembur dan THR", "lembur OR thr OR overtime"),
        ("Potongan dan slip gaji", '"slip gaji" OR dipotong OR potongan'),
    ],
    "kontrak-status": [
        ("Perpanjangan kontrak", "kontrak OR perpanjangan OR pkwt"),
        ("Outsourcing dan yayasan", 'outsourcing OR "alih daya" OR yayasan'),
        ("Karyawan tetap", '"karyawan tetap" OR "masa percobaan" OR probation'),
    ],
    "lokasi-penempatan": [
        ("Penempatan dan mutasi", "penempatan OR mutasi OR ditempatkan"),
        ("Mess dan transport", 'mess OR transport OR "luar kota"'),
    ],
    "shift-jam-kerja": [
        ("Pola shift", 'shift OR rolling OR "masuk malam"'),
        ("Jam kerja dan libur", '"jam kerja" OR libur OR jadwal'),
    ],
    "persyaratan-pendidikan": [
        ("Syarat ijazah", "ijazah OR sma OR smk OR lulusan"),
        ("Batas usia dan fisik", '"usia maksimal" OR "tinggi badan"'),
    ],
    "pengalaman-keahlian": [
        ("Fresh graduate", '"fresh graduate" OR pengalaman'),
        ("Sertifikat dan pelatihan", "sertifikat OR forklift OR training OR pelatihan"),
    ],
    "proses-melamar": [
        ("Interview dan psikotes", "interview OR wawancara OR psikotes"),
        ("Berkas lamaran", "berkas OR cv OR lamaran"),
        ("Menunggu pengumuman", 'pengumuman OR "nunggu kabar" OR panggilan'),
    ],
    "keamanan-penipuan": [
        ("Lowongan palsu", 'penipuan OR "loker palsu" OR "lowongan palsu"'),
        ("Diminta bayar", 'bayar OR pungli OR "biaya administrasi"'),
    ],
    "pengalaman-kandidat": [
        ("Ghosting", 'ghosting OR "nunggu kabar" OR dikabari'),
        ("Diterima atau ditolak", "diterima OR ditolak"),
    ],
    "reputasi-perusahaan": [
        ("Reputasi vendor", 'vendor OR penyalur OR "perusahaan outsourcing"'),
        ("Testimoni kerja", "testimoni OR review OR rekomendasi"),
    ],
}

# Batasan produk yang wajib terlihat pada metodologi, laporan, dan onboarding.
PRODUCT_LIMITATIONS: list[str] = [
    "Percakapan di X tidak mewakili seluruh populasi pencari kerja.",
    "Sentimen otomatis dapat salah memahami slang, sarkasme, dan konteks lokal.",
    "Volume percakapan bukan ukuran langsung kebutuhan tenaga kerja.",
    "Engagement tinggi tidak selalu berarti informasi paling benar.",
    "Data demo bersifat sintetis dan tidak boleh dibaca sebagai kondisi aktual.",
    "Dashboard mendukung eksplorasi informasi, bukan keputusan rekrutmen individu.",
    "Setiap insight harus diverifikasi oleh manusia sebelum digunakan.",
]
