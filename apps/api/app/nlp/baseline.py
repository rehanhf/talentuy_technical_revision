"""Implementasi baseline: rule + leksikon, deterministik, tanpa unduhan model.

Baseline ini sengaja transparan agar hasil label dapat dijelaskan kepada
pengguna dan dikoreksi manual oleh admin (human-in-the-loop).
"""

from __future__ import annotations

import re
import unicodedata

from app.nlp.base import (
    IntentClassifier,
    JobRoleTagger,
    KeywordExtractor,
    Label,
    SentimentAnalyzer,
    TopicClassifier,
)
from app.taxonomy import JOB_ROLE_FALLBACK, JOB_ROLE_TRIGGERS, TOPIC_SEED

MODEL_VERSION = "baseline-1.0.0"

# Ambang keyakinan; di bawah ini label sentimen menjadi "Tidak Yakin".
SENTIMENT_MIN_CONFIDENCE = 0.45

_SLANG_MAP = {
    "gaji nya": "gajinya",
    "yg": "yang",
    "ga": "tidak",
    "gak": "tidak",
    "nggak": "tidak",
    "ngga": "tidak",
    "engga": "tidak",
    "gk": "tidak",
    "tdk": "tidak",
    "udh": "sudah",
    "udah": "sudah",
    "blm": "belum",
    "bgt": "banget",
    "krn": "karena",
    "dgn": "dengan",
    "sy": "saya",
    "aq": "aku",
    "gw": "saya",
    "gue": "saya",
    "lu": "kamu",
    "lo": "kamu",
    "utk": "untuk",
    "sm": "sama",
    "jd": "jadi",
    "dr": "dari",
    "tp": "tapi",
    "kalo": "kalau",
    "klo": "kalau",
    "gimana": "bagaimana",
    "gmn": "bagaimana",
    "brp": "berapa",
    "bs": "bisa",
    "loker": "lowongan kerja",
    "ots": "outsourcing",
    "sif": "shift",
}

_POSITIVE_TERMS = {
    "alhamdulillah": 1.4, "senang": 1.2, "bagus": 1.1, "puas": 1.2, "ramah": 1.1,
    "cepat": 0.8, "responsif": 1.1, "jelas": 0.9, "diterima": 1.3, "lolos": 1.3,
    "amanah": 1.2, "rekomendasi": 1.0, "membantu": 1.0, "terbantu": 1.1,
    "nyaman": 1.0, "aman": 0.9, "sesuai": 0.9, "tepat waktu": 1.2, "lancar": 1.0,
    "mantap": 1.1, "makasih": 1.0, "terima kasih": 1.0, "semangat": 0.7,
}

_NEGATIVE_TERMS = {
    "kecewa": 1.4, "buruk": 1.2, "parah": 1.2, "lama": 0.7, "ribet": 1.0,
    "capek": 0.9, "ghosting": 1.3, "ditolak": 0.9, "penipuan": 1.5, "tipu": 1.4,
    "palsu": 1.3, "pungli": 1.5, "telat": 1.1, "dipotong": 1.2, "curang": 1.3,
    "keluhan": 1.0, "protes": 1.1, "capek banget": 1.2, "gaji kecil": 1.3,
    "tidak jelas": 1.2, "tidak sesuai": 1.3, "tidak dibayar": 1.5, "susah": 0.9,
    "males": 0.8, "bingung": 0.6, "berat": 0.7, "waspada": 0.8, "hati-hati": 0.7,
}

_NEGATORS = {"tidak", "bukan", "belum", "jangan", "kurang"}

_INTENT_RULES: list[tuple[str, tuple[str, ...], float]] = [
    (
        "Peringatan Penipuan",
        ("penipuan", "loker palsu", "lowongan palsu", "scam", "waspada", "hati-hati",
         "modus", "pungli", "tipu", "minta bayar"),
        0.9,
    ),
    (
        "Keluhan",
        ("kecewa", "parah", "ghosting", "tidak dibayar", "dipotong", "protes",
         "keluhan", "capek", "ribet", "tidak sesuai", "telat"),
        0.8,
    ),
    (
        "Promosi",
        ("dm ya", "join grup", "link di bio", "buruan daftar", "kuota terbatas",
         "info lengkap dm", "jasa", "promo"),
        0.75,
    ),
    (
        "Informasi Lowongan",
        ("dibutuhkan", "open recruitment", "lowongan kerja", "loker", "hiring",
         "kualifikasi", "penempatan", "kirim lamaran ke"),
        0.75,
    ),
    (
        "Pengalaman",
        ("pengalaman saya", "kemarin saya", "dulu saya", "waktu itu", "sudah",
         "akhirnya", "ternyata", "saya kerja"),
        0.6,
    ),
]

_QUESTION_MARKERS = (
    "apakah", "berapa", "bagaimana", "kenapa", "kapan", "dimana", "di mana",
    "adakah", "bisakah", "ada yang tau", "ada yg tau", "min ", "nanya", "tanya",
    "gimana", "gmn", "?",
)

_ROLE_KEYWORDS: dict[str, tuple[str, ...]] = JOB_ROLE_TRIGGERS

# Kata utuh, boleh berakhiran "-nya" (mis. "salesnya", "adminnya"), sehingga
# "admin" tidak cocok di dalam "administrasi" dan "md" tidak cocok di tengah kata.
_ROLE_PATTERNS: dict[str, list[tuple[str, re.Pattern[str]]]] = {
    role: [
        (kw, re.compile(rf"(?<![a-z0-9]){re.escape(kw)}(?:nya)?(?![a-z0-9])"))
        for kw in keywords
    ]
    for role, keywords in _ROLE_KEYWORDS.items()
}

_STOPWORDS = {
    "yang", "untuk", "dengan", "dari", "pada", "adalah", "ini", "itu", "saya",
    "aku", "kamu", "dan", "atau", "juga", "ada", "apa", "tidak", "sudah", "belum",
    "bisa", "kalau", "karena", "jadi", "tapi", "kok", "sih", "aja", "gitu", "nya",
    "di", "ke", "ya", "nih", "deh", "banget", "lagi", "mau", "kerja", "min",
    "berapa", "bagaimana", "kapan", "dimana", "kenapa", "orang", "gimana", "buat",
    # Sapaan dan basa-basi khas percakapan media sosial: sering muncul tetapi
    # tidak membawa makna rekrutmen, sehingga mengotori jaringan kata kunci.
    "halo", "hai", "permisi", "punten", "numpang", "tanya", "nanya", "makasih",
    "terima", "kasih", "sebelumnya", "sekalian", "mohon", "tolong", "teman",
    "temen", "gaes", "guys", "kakak", "abang", "please", "plis", "banget",
    "dong", "gais", "kali", "biasanya", "soalnya", "emang", "memang",
}


def normalize_text(text: str) -> str:
    """Normalisasi ringan: lowercase, hapus URL/mention, dan ekspansi slang."""
    lowered = unicodedata.normalize("NFKC", text).lower()
    lowered = re.sub(r"https?://\S+", " ", lowered)
    lowered = re.sub(r"@\w+", " ", lowered)
    lowered = lowered.replace("#", " ")
    lowered = re.sub(r"[^\w\s\?\!\-]", " ", lowered)
    tokens = [_SLANG_MAP.get(tok, tok) for tok in lowered.split()]
    return re.sub(r"\s+", " ", " ".join(tokens)).strip()


class LexiconSentimentAnalyzer(SentimentAnalyzer):
    """Skoring leksikon dengan penanganan negasi sederhana."""

    version = MODEL_VERSION

    def analyze(self, text: str) -> Label:
        normalized = normalize_text(text)
        tokens = normalized.split()
        pos = neg = 0.0
        evidence: list[str] = []

        for phrase, weight in _POSITIVE_TERMS.items():
            if phrase in normalized:
                if self._negated(normalized, phrase):
                    neg += weight * 0.8
                else:
                    pos += weight
                evidence.append(phrase)

        for phrase, weight in _NEGATIVE_TERMS.items():
            if phrase in normalized:
                neg += weight
                evidence.append(phrase)

        if "?" in text and not evidence:
            return Label(
                "Netral", 0.55, [],
                "Kalimat tanya tanpa kata bermuatan sentimen pada leksikon, sehingga Netral.",
            )

        total = pos + neg
        if total == 0:
            return Label(
                "Netral", 0.5, [],
                "Tidak ada kata bermuatan sentimen pada leksikon, sehingga Netral.",
            )

        margin = abs(pos - neg) / total
        confidence = round(min(0.95, 0.4 + margin * 0.55 + min(len(tokens), 30) / 300), 3)
        scores = f"skor positif {pos:.1f} dan negatif {neg:.1f}".replace(".", ",")
        if margin < 0.15 or confidence < SENTIMENT_MIN_CONFIDENCE:
            return Label(
                "Tidak Yakin", round(confidence, 3), evidence[:5],
                f"Leksikon sentimen memberi {scores}; selisihnya terlalu kecil "
                "untuk memilih satu polaritas.",
            )
        label = "Positif" if pos > neg else "Negatif"
        return Label(
            label, confidence, evidence[:5],
            f"Leksikon sentimen memberi {scores}; skor {label.lower()} lebih besar. "
            "Kata positif yang didahului negasi dihitung sebagai negatif.",
        )

    @staticmethod
    def _negated(normalized: str, phrase: str) -> bool:
        idx = normalized.find(phrase)
        window = normalized[max(0, idx - 22) : idx]
        return any(neg in window.split() for neg in _NEGATORS)


class KeywordTopicClassifier(TopicClassifier):
    """Klasifikasi topik berbasis kecocokan kata kunci taxonomy."""

    version = MODEL_VERSION

    def __init__(self) -> None:
        self._topics = [(slug, name, kws) for slug, name, _d, _c, kws in TOPIC_SEED]

    def classify(self, text: str) -> Label:
        normalized = normalize_text(text)
        best_slug, best_name, best_score, hits = "", "", 0.0, []
        for slug, name, keywords in self._topics:
            matched = [kw for kw in keywords if kw in normalized]
            if not matched:
                continue
            score = sum(1 + len(kw.split()) * 0.5 for kw in matched)
            if score > best_score:
                best_slug, best_name, best_score, hits = slug, name, score, matched
        if not best_slug:
            return Label(
                "", 0.0, [],
                "Tidak ada kata kunci taxonomy topik yang cocok, sehingga belum terklasifikasi.",
            )
        confidence = round(min(0.95, 0.45 + best_score * 0.12), 3)
        return Label(
            best_slug, confidence, hits[:5],
            f"Kata kunci taxonomy topik \"{best_name}\" paling banyak cocok "
            f"({len(hits)} kata). Frasa lebih dari satu kata diberi bobot lebih.",
        )


class RuleIntentClassifier(IntentClassifier):
    """Deteksi intent: pertanyaan diprioritaskan karena paling bernilai bagi HR."""

    version = MODEL_VERSION

    def classify(self, text: str) -> Label:
        raw = text.lower()
        normalized = normalize_text(text)

        question_hits = [m.strip() for m in _QUESTION_MARKERS if m in raw]
        if question_hits:
            confidence = 0.9 if "?" in raw else 0.7
            return Label(
                "Pertanyaan", confidence, question_hits[:4],
                "Penanda pertanyaan ditemukan. Aturan ini diperiksa paling awal "
                "karena pertanyaan paling bernilai bagi tim rekrutmen.",
            )

        for label, markers, confidence in _INTENT_RULES:
            hits = [m for m in markers if m in normalized]
            if hits:
                return Label(
                    label, confidence, hits[:4],
                    f"Tidak ada penanda pertanyaan; kata pemicu aturan \"{label}\" "
                    "ditemukan lebih dulu dibanding aturan lain.",
                )

        return Label(
            "Informasi Lowongan", 0.4, [],
            "Tidak ada aturan intensi yang terpicu, sehingga dipakai label bawaan.",
        )


class KeywordRoleTagger(JobRoleTagger):
    version = MODEL_VERSION

    def tag(self, text: str) -> Label:
        normalized = normalize_text(text)
        best_role, best_score, hits = JOB_ROLE_FALLBACK, 0.0, []
        for role, patterns in _ROLE_PATTERNS.items():
            matched = [kw for kw, pattern in patterns if pattern.search(normalized)]
            if not matched:
                continue
            score = sum(1 + len(kw.split()) * 0.5 for kw in matched)
            if score > best_score:
                best_role, best_score, hits = role, score, matched
        if not hits:
            return Label(
                JOB_ROLE_FALLBACK, 0.3, [],
                "Tidak ada kata kunci dari lima jenis pekerjaan, sehingga masuk Lainnya.",
            )
        confidence = round(min(0.95, 0.5 + best_score * 0.15), 3)
        return Label(
            best_role, confidence, hits[:4],
            f"Kata kunci jenis pekerjaan \"{best_role}\" paling banyak cocok "
            f"({len(hits)} kata).",
        )


class FrequencyKeywordExtractor(KeywordExtractor):
    """Ekstraksi kata kunci per-dokumen (unigram + bigram) tanpa stopword."""

    version = MODEL_VERSION

    def extract(self, text: str, limit: int = 8) -> list[str]:
        tokens = [t for t in normalize_text(text).split() if len(t) > 3 and t not in _STOPWORDS]
        counts: dict[str, int] = {}
        for token in tokens:
            counts[token] = counts.get(token, 0) + 1
        for first, second in zip(tokens, tokens[1:]):
            bigram = f"{first} {second}"
            counts[bigram] = counts.get(bigram, 0) + 2
        ranked = sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))
        return [term for term, _ in ranked[:limit]]
