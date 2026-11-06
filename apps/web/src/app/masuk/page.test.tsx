import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import LoginPage from "@/app/masuk/page";
import { ApiError } from "@/lib/api";

const replace = vi.fn();
const login = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
}));

vi.mock("@/hooks/useAuth", async () => {
  const actual = await vi.importActual<typeof import("@/hooks/useAuth")>(
    "@/hooks/useAuth",
  );
  return {
    ...actual,
    useAuth: () => ({
      user: null,
      isLoading: false,
      login,
      logout: vi.fn(),
    }),
  };
});

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    apiRequest: vi.fn(async () => ({
      accounts: [
        { email: "admin@talentpulse.local", description: "Kelola data" },
      ],
      password: "TalentPulse123!",
    })),
  };
});

describe("halaman masuk", () => {
  beforeEach(() => {
    replace.mockClear();
    login.mockReset();
  });

  it("menyatakan status prototipe dan data sintetis", async () => {
    render(<LoginPage />);
    expect(screen.getByText(/prototipe internal/i)).toBeInTheDocument();
    // Tunggu daftar akun demo selesai dimuat agar tidak ada update tertunda.
    await screen.findByText("admin@talentpulse.local");
  });

  it("menolak pengiriman tanpa kata sandi", async () => {
    render(<LoginPage />);
    await screen.findByText("admin@talentpulse.local");
    await userEvent.click(screen.getByRole("button", { name: "Masuk" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Kata sandi wajib diisi.");
    expect(login).not.toHaveBeenCalled();
  });

  it("mengarahkan ke Overview setelah login berhasil", async () => {
    login.mockResolvedValue(undefined);
    render(<LoginPage />);

    await userEvent.type(screen.getByLabelText("Kata sandi"), "TalentPulse123!");
    await userEvent.click(screen.getByRole("button", { name: "Masuk" }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(login).toHaveBeenCalledWith("analyst@talentpulse.local", "TalentPulse123!");
  });

  it("menampilkan pesan Bahasa Indonesia saat kredensial salah", async () => {
    login.mockRejectedValue(new ApiError(401, "Email atau kata sandi salah."));
    render(<LoginPage />);

    await userEvent.type(screen.getByLabelText("Kata sandi"), "salah");
    await userEvent.click(screen.getByRole("button", { name: "Masuk" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Sesi Anda berakhir. Silakan masuk kembali.",
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it("mengisi formulir dari daftar akun demo", async () => {
    render(<LoginPage />);
    const demoButton = await screen.findByText("admin@talentpulse.local");

    await userEvent.click(demoButton);
    expect(screen.getByLabelText("Email")).toHaveValue("admin@talentpulse.local");
  });
});
