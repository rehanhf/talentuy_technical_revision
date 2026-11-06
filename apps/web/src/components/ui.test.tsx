import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  ChangeBadge,
  ConfirmDialog,
  Drawer,
  EmptyState,
  ErrorState,
  NoResultState,
  SentimentBadge,
} from "@/components/ui";

describe("state wajib halaman", () => {
  it("menampilkan empty state beserta aksinya", () => {
    render(
      <EmptyState
        title="Belum ada monitor"
        description="Simpan kombinasi kata kunci yang sering diperiksa."
        action={<button type="button">Buat monitor pertama</button>}
      />,
    );
    expect(screen.getByText("Belum ada monitor")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Buat monitor pertama" }),
    ).toBeInTheDocument();
  });

  it("menawarkan pemulihan pada state tanpa hasil", async () => {
    const onReset = vi.fn();
    render(<NoResultState query="gaji gudang" onReset={onReset} />);

    expect(screen.getByText(/Tidak ada hasil/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Hapus semua filter/ }));
    expect(onReset).toHaveBeenCalledOnce();
  });

  it("menyatakan error sebagai alert dan dapat dicoba ulang", async () => {
    const onRetry = vi.fn();
    render(<ErrorState message="Tidak dapat terhubung ke server." onRetry={onRetry} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Data gagal dimuat");
    await userEvent.click(screen.getByRole("button", { name: /Coba lagi/ }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

});

describe("badge", () => {
  it("menyatakan perubahan yang tidak dapat dibandingkan", () => {
    render(<ChangeBadge value={null} />);
    expect(screen.getByText("Tidak dapat dibandingkan")).toBeInTheDocument();
  });

  // Sentimen tidak boleh dibedakan hanya lewat warna.
  it("menampilkan teks label pada badge sentimen", () => {
    render(<SentimentBadge label="Negatif" />);
    expect(screen.getByText("Negatif")).toBeInTheDocument();
  });
});

describe("navigasi keyboard", () => {
  it("menutup drawer detail post dengan Escape", async () => {
    const onClose = vi.fn();
    render(
      <Drawer open onClose={onClose} title="Detail post">
        <p>Isi post</p>
      </Drawer>,
    );

    expect(screen.getByRole("dialog", { name: "Detail post" })).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("meminta konfirmasi sebelum aksi destruktif", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Hapus laporan?"
        description="Tindakan ini tidak dapat dibatalkan."
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByRole("alertdialog", { name: "Hapus laporan?" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Batal" }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
