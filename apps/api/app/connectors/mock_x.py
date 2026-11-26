"""MockXConnector — generator percakapan sintetis Bahasa Indonesia informal.

Seluruh teks dibangkitkan dari template dan tidak meniru akun, orang, atau
post nyata. Setiap record ditandai `is_synthetic=True` dan memakai Post ID
berformat `demo_000001`.
"""

from __future__ import annotations

import random
from datetime import datetime, timedelta

from app.timeutil import utcnow
from app.connectors.base import RawPost, SocialDataConnector
from app.taxonomy import JOB_ROLES

# Frasa peran seperti yang biasa ditulis pencari kerja di media sosial.
ROLE_PHRASES: dict[str, list[str]] = {
    "Salesman": ["sales", "salesman", "sales lapangan", "sales motoris", "sales kanvas"],
    "Merchandiser": ["merchandiser", "MD", "md toko", "merchandiser supermarket"],
    "SPG/SPB": ["SPG", "SPB", "spg event", "sales promotion", "spg mall"],
    "Staf Officer": ["staff officer", "staf officer", "staf kantor", "officer"],
    "Administrasi": ["staff admin", "admin data entry", "admin kantor", "staf administrasi"],
    # Posisi di luar lima posisi penempatan; tidak memicu label mana pun.
    "Lainnya": [
        "kerjaan ini", "posisi ini", "lowongan ini", "helper gudang", "kasir minimarket",
        "driver", "security",
    ],
}

LOCATIONS = [
    "Cikarang", "Bekasi", "Tangerang", "Karawang", "Surabaya", "Semarang",
    "Bandung", "Depok", "Cibitung", "Jakarta Utara", "Sidoarjo", "Gresik",
    "Bogor", "Medan", "Makassar",
]

VENDOR_TERMS = ["vendor penyalur", "perusahaan outsourcing", "yayasan penyalur", "agency"]

# Template: (topic_slug, intent, teks dengan placeholder)
TEMPLATES: list[tuple[str, str, str]] = [
    # --- Gaji dan Benefit ---
    ("gaji-benefit", "Pertanyaan", "min kalau {role} di {loc} gajinya udah UMR belum ya?"),
    ("gaji-benefit", "Pertanyaan", "ada yang tau {role} itu dapet uang makan sama transport ga?"),
    ("gaji-benefit", "Pertanyaan", "berapa sih take home pay {role} sekarang? soalnya info di loker cuma tulis nego"),
    ("gaji-benefit", "Pertanyaan", "kalau lembur {role} dihitung per jam apa flat sih?"),
    ("gaji-benefit", "Pertanyaan", "THR buat karyawan kontrak {role} tetep dapet full ga sih"),
    ("gaji-benefit", "Keluhan", "gaji {role} kecil banget tapi kerjaan numpuk, capek"),
    ("gaji-benefit", "Keluhan", "slip gaji {role} ga pernah dikasih, potongan juga ga jelas buat apa"),
    ("gaji-benefit", "Keluhan", "udah 3 bulan lembur jadi {role} tapi uang lemburnya belum dibayar"),
    ("gaji-benefit", "Pengalaman", "alhamdulillah gaji {role} di {loc} naik dikit tahun ini, lumayan"),
    ("gaji-benefit", "Pengalaman", "kemarin saya {role}, BPJS ketenagakerjaan aktif dari bulan pertama, aman sih"),
    ("gaji-benefit", "Informasi Lowongan", "dibutuhkan {role} penempatan {loc}, gaji UMK plus uang makan, BPJS disediakan"),
    # --- Kontrak dan Status Kerja ---
    ("kontrak-status", "Pertanyaan", "kalau kontrak {role} 6 bulan, bisa diperpanjang otomatis ga sih?"),
    ("kontrak-status", "Pertanyaan", "bedanya PKWT sama outsourcing apa ya buat posisi {role}?"),
    ("kontrak-status", "Pertanyaan", "masa percobaan {role} biasanya berapa lama sih?"),
    ("kontrak-status", "Pertanyaan", "ada yang pernah dari kontrak {role} jadi karyawan tetap ga?"),
    ("kontrak-status", "Keluhan", "kontrak {role} diputus mendadak padahal baru jalan 2 bulan, kecewa"),
    ("kontrak-status", "Keluhan", "status alih daya {role} bikin ga jelas, tiap tahun ganti vendor terus"),
    ("kontrak-status", "Pengalaman", "saya {role} kontrak setahun, alhamdulillah diperpanjang dan prosesnya jelas"),
    ("kontrak-status", "Informasi Lowongan", "open recruitment {role} sistem PKWT 12 bulan, penempatan {loc}"),
    # --- Lokasi dan Penempatan ---
    ("lokasi-penempatan", "Pertanyaan", "penempatan {role} di {loc} itu bisa milih cabang ga?"),
    ("lokasi-penempatan", "Pertanyaan", "kalau ditempatkan luar kota disediain mess ga ya buat {role}?"),
    ("lokasi-penempatan", "Pertanyaan", "ada yang tau {role} di {loc} jauh ga dari stasiun?"),
    ("lokasi-penempatan", "Keluhan", "baru seminggu jadi {role} udah dimutasi ke {loc}, jauh banget dari rumah"),
    ("lokasi-penempatan", "Keluhan", "ongkos transport ke penempatan {role} lebih gede dari uang transportnya"),
    ("lokasi-penempatan", "Pengalaman", "penempatan {role} saya deket rumah, jadi hemat transport banget"),
    ("lokasi-penempatan", "Informasi Lowongan", "butuh {role} untuk area {loc}, diutamakan domisili sekitar"),
    # --- Sistem Shift dan Jam Kerja ---
    ("shift-jam-kerja", "Pertanyaan", "shift {role} itu rolling apa tetap ya?"),
    ("shift-jam-kerja", "Pertanyaan", "jam kerja {role} 8 jam apa 12 jam sih? soalnya beda beda infonya"),
    ("shift-jam-kerja", "Pertanyaan", "kalau masuk shift malam ada tunjangan tambahan ga?"),
    ("shift-jam-kerja", "Pertanyaan", "libur {role} berapa hari sebulan ya? apa ikut jadwal toko"),
    ("shift-jam-kerja", "Keluhan", "shift malam {role} terus 2 minggu berturut turut, badan ga kuat"),
    ("shift-jam-kerja", "Keluhan", "jadwal shift {role} suka berubah mendadak, susah atur waktu keluarga"),
    ("shift-jam-kerja", "Pengalaman", "shift {role} di tempat saya jelas, jadwalnya keluar sebulan sebelumnya"),
    ("shift-jam-kerja", "Informasi Lowongan", "dicari {role} sistem 3 shift, penempatan {loc}, libur mingguan diatur"),
    # --- Persyaratan Pendidikan ---
    ("persyaratan-pendidikan", "Pertanyaan", "lulusan SMK jurusan apa aja sih yang bisa daftar {role}?"),
    ("persyaratan-pendidikan", "Pertanyaan", "usia maksimal buat {role} sekarang berapa ya?"),
    ("persyaratan-pendidikan", "Pertanyaan", "ijazah masih ditahan sekolah, bisa daftar {role} pakai SKL ga?"),
    ("persyaratan-pendidikan", "Keluhan", "syarat tinggi badan buat {role} kok masih dipakai sih, agak ga relevan"),
    ("persyaratan-pendidikan", "Pengalaman", "saya lulusan SMA dan diterima jadi {role}, jadi jangan minder duluan"),
    ("persyaratan-pendidikan", "Informasi Lowongan", "kualifikasi {role}: minimal SMA/SMK sederajat, bersedia ditempatkan di {loc}"),
    # --- Pengalaman dan Keahlian ---
    ("pengalaman-keahlian", "Pertanyaan", "buat jadi {role} wajib punya sertifikat forklift ga sih?"),
    ("pengalaman-keahlian", "Pertanyaan", "fresh graduate boleh daftar {role} ga ya, atau harus pengalaman 1 tahun?"),
    ("pengalaman-keahlian", "Pertanyaan", "SIM A doang cukup ga buat lamar {role}?"),
    ("pengalaman-keahlian", "Pertanyaan", "excel yang dipakai admin gudang sampai level apa sih"),
    ("pengalaman-keahlian", "Pengalaman", "training {role} di tempat saya lumayan lengkap, dibimbing 2 minggu"),
    ("pengalaman-keahlian", "Keluhan", "syarat {role} pengalaman minimal 2 tahun tapi gajinya setara fresh graduate"),
    ("pengalaman-keahlian", "Informasi Lowongan", "dibutuhkan {role} berpengalaman minimal 1 tahun, pelatihan tetap diberikan"),
    # --- Proses Melamar ---
    ("proses-melamar", "Pertanyaan", "lamaran {role} dikirim online apa harus walk in interview sih?"),
    ("proses-melamar", "Pertanyaan", "berkas buat melamar {role} apa aja ya selain CV sama ijazah?"),
    ("proses-melamar", "Pertanyaan", "psikotes buat {role} susah ga? materinya apa aja"),
    ("proses-melamar", "Pertanyaan", "medical check up buat {role} dibayarin perusahaan apa pribadi?"),
    ("proses-melamar", "Pertanyaan", "berapa lama biasanya pengumuman hasil interview {role} keluar?"),
    ("proses-melamar", "Keluhan", "udah interview {role} 3 minggu lalu tapi ga ada kabar sama sekali"),
    ("proses-melamar", "Keluhan", "proses lamaran {role} ribet banget, disuruh bolak balik bawa berkas yang sama"),
    ("proses-melamar", "Pengalaman", "proses {role} cepat, interview hari senin, hari kamis udah dikabari diterima"),
    ("proses-melamar", "Informasi Lowongan", "kirim lamaran ke email resmi HRD, cantumkan posisi {role} dan domisili"),
    # --- Keamanan dan Penipuan Lowongan ---
    ("keamanan-penipuan", "Peringatan Penipuan", "hati hati ada yang ngaku HRD minta bayar administrasi 250rb buat posisi {role}, itu penipuan"),
    ("keamanan-penipuan", "Peringatan Penipuan", "waspada loker palsu {role} mengatasnamakan perusahaan besar, rekrutmen resmi ga pernah minta uang"),
    ("keamanan-penipuan", "Peringatan Penipuan", "modus baru: dikasih surat panggilan kerja {role} di {loc} tapi disuruh transfer tiket dulu"),
    ("keamanan-penipuan", "Peringatan Penipuan", "lowongan palsu {role} makin banyak, cek dulu akun resminya sebelum kirim data pribadi"),
    ("keamanan-penipuan", "Pertanyaan", "ini loker {role} beneran apa penipuan ya? soalnya diminta bayar seragam dulu"),
    ("keamanan-penipuan", "Keluhan", "temen saya kena tipu loker {role}, uangnya ga balik sampai sekarang"),
    # --- Pengalaman Kandidat ---
    ("pengalaman-kandidat", "Pengalaman", "kemarin interview {role}, HRD nya ramah dan jelasin kontrak dari awal"),
    ("pengalaman-kandidat", "Pengalaman", "antre walk in interview {role} dari pagi, tapi panitianya rapi ngatur nomor"),
    ("pengalaman-kandidat", "Keluhan", "ghosting lagi nih, lamaran {role} katanya dikabari 3 hari tapi udah 2 minggu diem"),
    ("pengalaman-kandidat", "Keluhan", "ditolak jadi {role} ga apa apa, tapi tolong dikabarin biar ga nunggu lama"),
    ("pengalaman-kandidat", "Pertanyaan", "normal ga sih nunggu kabar hasil seleksi {role} sampai sebulan?"),
    ("pengalaman-kandidat", "Pengalaman", "akhirnya diterima jadi {role} di {loc}, doain betah ya"),
    # --- Reputasi Perusahaan Outsourcing ---
    ("reputasi-perusahaan", "Pertanyaan", "ada yang pernah kerja lewat {vendor} buat posisi {role}? gimana kerjanya"),
    ("reputasi-perusahaan", "Pertanyaan", "{vendor} ini amanah ga sih soal pembayaran gaji?"),
    ("reputasi-perusahaan", "Pengalaman", "saya lewat {vendor} 2 tahun, gaji selalu tepat waktu, cukup rekomendasi"),
    ("reputasi-perusahaan", "Keluhan", "{vendor} nya susah dihubungi kalau ada masalah absensi"),
    ("reputasi-perusahaan", "Informasi Lowongan", "{vendor} sedang membuka posisi {role} untuk area {loc}"),
    ("reputasi-perusahaan", "Promosi", "butuh info loker {role} area {loc}? gabung grup info lowongan, gratis"),
]

# Variasi gaya penulisan untuk menambah kealamian teks.
PREFIXES = ["", "", "", "halo semua, ", "numpang tanya ya, ", "info dong, ", "guys ", "min "]
SUFFIXES = ["", "", "", "", " makasih sebelumnya", " tolong dijawab ya", " mohon infonya", " thanks"]
HASHTAGS = [
    "#loker", "#lowongankerja", "#lokerjakarta", "#infoloker", "#karir",
    "#lokerbekasi", "#lokergudang", "#fyp",
]

# Typo ringan yang wajar muncul pada percakapan cepat.
TYPO_MAP = {
    "yang": "yg", "tidak": "ga", "sudah": "udh", "dengan": "dgn", "untuk": "utk",
    "banget": "bgt", "karena": "krn", "bagaimana": "gmn", "berapa": "brp",
    "lowongan": "lowongn", "penempatan": "penempatn", "interview": "intervew",
}


# Lonjakan minggu berjalan: kelompok isu, jumlah minimum post-nya pada minggu itu,
# dan porsi volume minggu itu yang dialihkan ke isu tersebut. Sekitar sepertiga
# templat terklasifikasi ke isu lain, jadi minimum 24 menjamin ambang volume (10)
# dan ambang kenaikan (+50% atas rata-rata 4 minggu) terlampaui dengan selisih
# aman walau seed dijalankan pada hari Senin.
CURRENT_WEEK_SPIKE_TOPIC = "keamanan-penipuan"
CURRENT_WEEK_SPIKE_MIN_POSTS = 24
CURRENT_WEEK_SPIKE_FOCUS = 0.35


class MockXConnector(SocialDataConnector):
    name = "mock_x"
    label = "Data Demo Sintetis"
    description = (
        "Generator percakapan sintetis Bahasa Indonesia. Selalu tersedia dan "
        "tidak memerlukan credential apa pun."
    )

    def __init__(self, random_state: int = 20260828) -> None:
        self._random_state = random_state

    @property
    def is_available(self) -> bool:
        return True

    def fetch(
        self,
        *,
        count: int = 1400,
        days: int = 90,
        end: datetime | None = None,
        id_offset: int = 0,
        **_kwargs,
    ) -> list[RawPost]:
        rng = random.Random(self._random_state + id_offset)
        end_dt = (end or utcnow()).replace(hour=23, minute=0, second=0, microsecond=0)
        start_dt = end_dt - timedelta(days=days - 1)

        weights = self._day_weights(rng, days, start_dt)
        spikes = self._spike_plan(rng, days)

        # Lonjakan pada minggu berjalan (Senin s.d. hari seed). Dataset selalu
        # berakhir pada hari seed dijalankan, sehingga minggu berjalan saat demo
        # memuat satu kelompok isu yang melonjak.
        current_week_days = end_dt.weekday() + 1
        current_week = range(max(0, days - current_week_days), days)
        current_share = sum(weights[i] for i in current_week) / sum(weights)
        current_target = max(
            CURRENT_WEEK_SPIKE_MIN_POSTS,
            round(count * current_share * CURRENT_WEEK_SPIKE_FOCUS),
        )
        current_week_quota = {
            i: -(-current_target // len(current_week)) for i in current_week
        }

        # Jumlah post per hari ditentukan di muka agar total tepat `count` tanpa
        # memotong hari-hari terakhir (tempat lonjakan minggu berjalan berada).
        day_counts = [max(1, round(count * w / sum(weights))) for w in weights]
        for i, forced in current_week_quota.items():
            day_counts[i] = max(day_counts[i], forced + 2)
        adjustable = sorted(
            (i for i in range(days) if i not in current_week_quota),
            key=lambda i: day_counts[i],
            reverse=True,
        )
        cursor = 0
        while sum(day_counts) > count and adjustable:
            i = adjustable[cursor % len(adjustable)]
            if day_counts[i] > 1:
                day_counts[i] -= 1
            cursor += 1
            if cursor > days * count:  # pragma: no cover - pengaman
                break

        posts: list[RawPost] = []
        counter = id_offset
        for day_index in range(days):
            day = start_dt + timedelta(days=day_index)
            day_count = day_counts[day_index]
            focus_topic = spikes.get(day_index)
            forced = current_week_quota.get(day_index, 0)

            for post_index in range(day_count):
                counter += 1
                if post_index < forced:
                    pool = [t for t in TEMPLATES if t[0] == CURRENT_WEEK_SPIKE_TOPIC]
                    topic_slug, intent, template = rng.choice(pool)
                else:
                    topic_slug, intent, template = self._pick_template(rng, focus_topic)
                role = self._pick_role(rng, topic_slug)
                text = self._render(rng, template, role)
                created = day.replace(
                    hour=rng.choice([7, 8, 9, 11, 12, 13, 15, 17, 19, 20, 21, 22]),
                    minute=rng.randint(0, 59),
                    second=rng.randint(0, 59),
                )
                posts.append(
                    RawPost(
                        external_post_id=f"demo_{counter:06d}",
                        text=text,
                        created_at_source=created,
                        language="id" if rng.random() > 0.02 else "en",
                        author_public_id=f"demo_user_{rng.randint(1, 480):04d}",
                        like_count=self._engagement(rng, intent, base=14),
                        repost_count=self._engagement(rng, intent, base=4),
                        reply_count=self._engagement(rng, intent, base=6),
                        quote_count=self._engagement(rng, intent, base=2),
                        url=f"https://example.invalid/demo/{counter:06d}",
                        is_synthetic=True,
                        source="demo",
                        extra={"topic_hint": topic_slug, "intent_hint": intent},
                    )
                )
                if len(posts) >= count:
                    return posts[:count]

        # Lengkapi bila pembulatan harian menghasilkan kurang dari target.
        while len(posts) < count:
            counter += 1
            topic_slug, intent, template = self._pick_template(rng, None)
            role = self._pick_role(rng, topic_slug)
            day_index = rng.randrange(days)
            created = (start_dt + timedelta(days=day_index)).replace(
                hour=rng.randint(7, 22), minute=rng.randint(0, 59)
            )
            posts.append(
                RawPost(
                    external_post_id=f"demo_{counter:06d}",
                    text=self._render(rng, template, role),
                    created_at_source=created,
                    author_public_id=f"demo_user_{rng.randint(1, 480):04d}",
                    like_count=self._engagement(rng, intent, base=10),
                    repost_count=self._engagement(rng, intent, base=3),
                    reply_count=self._engagement(rng, intent, base=5),
                    quote_count=self._engagement(rng, intent, base=1),
                    url=f"https://example.invalid/demo/{counter:06d}",
                    extra={"topic_hint": topic_slug, "intent_hint": intent},
                )
            )
        return posts

    # ------------------------------------------------------------------ utils

    @staticmethod
    def _day_weights(rng: random.Random, days: int, start: datetime) -> list[float]:
        """Bobot harian: Sabtu-Minggu (menurut tanggal sebenarnya) lebih sepi, ditambah derau."""
        weights = []
        for index in range(days):
            weekday = (start + timedelta(days=index)).weekday()
            base = 0.65 if weekday in (5, 6) else 1.0
            trend = 1 + (index / max(days - 1, 1)) * 0.25  # tren naik perlahan
            weights.append(base * trend * rng.uniform(0.82, 1.2))
        return weights

    @staticmethod
    def _spike_plan(rng: random.Random, days: int) -> dict[int, str]:
        """Lonjakan terencana agar grafik tren memiliki cerita yang dapat digali."""
        spikes: dict[int, str] = {}
        planned = [
            (int(days * 0.22), "keamanan-penipuan", 3),
            (int(days * 0.48), "gaji-benefit", 4),
            (int(days * 0.71), "shift-jam-kerja", 3),
            (int(days * 0.90), "proses-melamar", 4),
        ]
        for start, topic, length in planned:
            for offset in range(length):
                index = min(days - 1, start + offset)
                spikes[index] = topic
        rng.random()  # jaga determinisme urutan pemanggilan rng
        return spikes

    def _pick_template(
        self, rng: random.Random, focus_topic: str | None
    ) -> tuple[str, str, str]:
        if focus_topic and rng.random() < 0.62:
            pool = [t for t in TEMPLATES if t[0] == focus_topic]
            if pool:
                return rng.choice(pool)
        return rng.choice(TEMPLATES)

    @staticmethod
    def _pick_role(rng: random.Random, topic_slug: str) -> str:
        # Distribusi peran sengaja tidak merata: SPG/SPB dan Salesman paling
        # banyak karena keduanya posisi yang paling banyak ditempatkan mitra.
        weighted = (
            ["SPG/SPB"] * 6
            + ["Salesman"] * 5
            + ["Merchandiser"] * 3
            + ["Administrasi"] * 2
            + ["Staf Officer"] * 2
            + ["Lainnya"] * 2
        )
        role = rng.choice(weighted)
        return rng.choice(ROLE_PHRASES.get(role, ROLE_PHRASES["Lainnya"]))

    @staticmethod
    def _render(rng: random.Random, template: str, role_phrase: str) -> str:
        text = template.format(
            role=role_phrase,
            loc=rng.choice(LOCATIONS),
            vendor=rng.choice(VENDOR_TERMS),
        )
        text = rng.choice(PREFIXES) + text + rng.choice(SUFFIXES)

        if rng.random() < 0.28:  # typo wajar
            for word, typo in TYPO_MAP.items():
                if word in text and rng.random() < 0.5:
                    text = text.replace(word, typo, 1)
                    break
        if rng.random() < 0.22:
            text += " " + rng.choice(HASHTAGS)
        if rng.random() < 0.1:
            text = text.capitalize()
        return text.strip()

    @staticmethod
    def _engagement(rng: random.Random, intent: str, base: int) -> int:
        """Engagement sintetis; peringatan penipuan cenderung lebih menyebar."""
        multiplier = {
            "Peringatan Penipuan": 3.2,
            "Keluhan": 1.8,
            "Pengalaman": 1.3,
            "Pertanyaan": 1.0,
            "Informasi Lowongan": 1.5,
            "Promosi": 0.6,
        }.get(intent, 1.0)
        # Distribusi ekor panjang: sebagian kecil post jauh lebih viral.
        value = rng.expovariate(1 / (base * multiplier))
        if rng.random() < 0.03:
            value *= rng.uniform(4, 12)
        return int(min(value, base * multiplier * 40))


ALL_ROLES = JOB_ROLES
