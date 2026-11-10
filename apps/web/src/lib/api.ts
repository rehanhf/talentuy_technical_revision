/** Klien HTTP tipis untuk API TalentPulse. */

/**
 * Bawaan `/api`: permintaan dikirim ke domain frontend sendiri lalu diteruskan ke
 * backend oleh rewrite di next.config.mjs. Isi URL absolut hanya bila backend
 * sengaja diekspos di alamat publik terpisah.
 */
export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "/api").replace(/\/+$/, "");

const TOKEN_KEY = "talentpulse.token";

export class ApiError extends Error {
  status: number;
  fieldErrors: Array<{ field: string; message: string }>;

  constructor(
    status: number,
    message: string,
    fieldErrors: Array<{ field: string; message: string }> = [],
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }

  /** Pesan siap tampil dalam Bahasa Indonesia. */
  get userMessage(): string {
    if (this.status === 0) {
      return "Tidak dapat terhubung ke server. Periksa koneksi atau status layanan API.";
    }
    if (this.status === 401) return "Sesi Anda berakhir. Silakan masuk kembali.";
    if (this.status === 403) return "Anda tidak memiliki izin untuk tindakan ini.";
    if (this.status === 404) return "Data yang diminta tidak ditemukan.";
    if (this.status >= 500) {
      return "Terjadi kesalahan pada server. Coba beberapa saat lagi.";
    }
    return this.message;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Query params; array menghasilkan parameter berulang (job_roles=a&job_roles=b). */
  params?: Record<string, unknown>;
  raw?: boolean;
}

function buildUrl(path: string, params?: Record<string, unknown>): string {
  const origin = typeof window === "undefined" ? "http://localhost" : window.location.origin;
  const url = new URL(path.startsWith("http") ? path : `${API_BASE_URL}${path}`, origin);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === "") continue;
      if (Array.isArray(value)) {
        value.filter((v) => v !== "" && v !== null).forEach((v) => url.searchParams.append(key, String(v)));
      } else {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, params, raw, headers, ...rest } = options;
  const token = getToken();

  let response: Response;
  try {
    response = await fetch(buildUrl(path, params), {
      ...rest,
      headers: {
        ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body:
        body === undefined
          ? undefined
          : body instanceof FormData
            ? body
            : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "Tidak dapat terhubung ke server.");
  }

  if (response.status === 204) return undefined as T;

  if (!response.ok) {
    let message = `Permintaan gagal (${response.status}).`;
    let fieldErrors: Array<{ field: string; message: string }> = [];
    try {
      const payload = await response.json();
      if (typeof payload.detail === "string") message = payload.detail;
      if (Array.isArray(payload.errors)) fieldErrors = payload.errors;
    } catch {
      /* body bukan JSON — pakai pesan default */
    }
    if (response.status === 401) setToken(null);
    throw new ApiError(response.status, message, fieldErrors);
  }

  if (raw) return (await response.blob()) as T;
  return (await response.json()) as T;
}

/** Unduh berkas ekspor sambil tetap mengirim header Authorization. */
export async function downloadFile(path: string, filename: string): Promise<void> {
  const blob = await apiRequest<Blob>(path, { raw: true });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}
