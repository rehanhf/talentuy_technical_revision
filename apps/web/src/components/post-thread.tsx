"use client";

import { CornerDownRight, MessageSquareReply } from "lucide-react";

import { usePostThread } from "@/hooks/useApi";
import { formatDateTime } from "@/lib/format";
import type { Post } from "@/lib/types";

function PostSnippet({ post, onOpen }: { post: Post; onOpen: (post: Post) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(post)}
      className="block w-full rounded-lg border border-line px-3 py-2 text-left transition hover:border-primary"
    >
      <span className="line-clamp-2 text-xs leading-relaxed text-ink">{post.text}</span>
      <span className="mt-1 block text-[11px] text-muted">
        {formatDateTime(post.created_at_source)}
        {post.topic_name ? ` · ${post.topic_name}` : ""} · {post.sentiment_label}
      </span>
    </button>
  );
}

/**
 * Relasi balasan (induk_id): post yang dibalas dan balasan tersimpan.
 * Tidak dirender bila post bukan balasan dan belum punya balasan tersimpan.
 */
export function PostThreadSection({
  post,
  onOpen,
}: {
  post: Post;
  onOpen: (post: Post) => void;
}) {
  const thread = usePostThread(post.id);
  const data = thread.data;
  if (!data) return null;
  const hasParentInfo = Boolean(data.induk || data.induk_external_id);
  if (!hasParentInfo && data.balasan.length === 0) return null;

  return (
    <section aria-labelledby="judul-utas">
      <h3
        id="judul-utas"
        className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted"
      >
        Utas balasan
      </h3>

      {hasParentInfo && (
        <div className="mb-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] text-muted">
            <MessageSquareReply className="h-3.5 w-3.5" aria-hidden />
            Post ini adalah balasan untuk:
          </p>
          {data.induk ? (
            <PostSnippet post={data.induk} onOpen={onOpen} />
          ) : (
            <p className="rounded-lg border border-dashed border-line px-3 py-2 text-[11px] text-muted">
              Post induk (ID {data.induk_external_id}) belum diimpor atau sudah dihapus
              sesuai kebijakan retensi.
            </p>
          )}
        </div>
      )}

      {data.balasan.length > 0 && (
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] text-muted">
            <CornerDownRight className="h-3.5 w-3.5" aria-hidden />
            {data.balasan.length} balasan tersimpan
          </p>
          <ul className="space-y-1.5">
            {data.balasan.map((reply) => (
              <li key={reply.id}>
                <PostSnippet post={reply} onOpen={onOpen} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
