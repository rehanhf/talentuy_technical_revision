"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";

import { apiRequest } from "@/lib/api";
import type {
  AuditEntry,
  ConnectorsResponse,
  DataQuality,
  ImportResult,
  IngestionRun,
  Insight,
  KeywordPreset,
  MethodologyResponse,
  Monitor,
  OverviewResponse,
  Post,
  PostListResponse,
  Report,
  ReportPreview,
  SourceQuery,
  SuggestedInsight,
  TaxonomyResponse,
  TopicDetailResponse,
  TopicsResponse,
  TrendsResponse,
  UsabilitySummaryItem,
} from "@/lib/types";

type Params = Record<string, unknown>;

/** Query dashboard: data lama tetap tampil saat filter berubah (tanpa kedip). */
function dashboardQuery<T>(
  key: unknown[],
  path: string,
  params: Params,
  options?: Partial<UseQueryOptions<T>>,
) {
  return {
    queryKey: key,
    queryFn: () => apiRequest<T>(path, { params }),
    staleTime: 60_000,
    placeholderData: <D,>(previous: D) => previous,
    ...options,
  } as UseQueryOptions<T>;
}

export function useOverview(params: Params) {
  return useQuery(
    dashboardQuery<OverviewResponse>(["overview", params], "/dashboard/overview", params),
  );
}

export function useTrends(
  params: Params,
  granularity: "daily" | "weekly",
  breakdown: string,
) {
  const merged = { ...params, granularity, breakdown };
  return useQuery(
    dashboardQuery<TrendsResponse>(["trends", merged], "/dashboard/trends", merged),
  );
}

export function useTopics(params: Params) {
  return useQuery(
    dashboardQuery<TopicsResponse>(["topics", params], "/dashboard/topics", params),
  );
}

export function useTopicDetail(slug: string | null, params: Params) {
  return useQuery({
    ...dashboardQuery<TopicDetailResponse>(
      ["topic-detail", slug, params],
      `/dashboard/topics/${slug}`,
      params,
    ),
    enabled: Boolean(slug),
  });
}

export function usePosts(
  params: Params,
  sort: string,
  page: number,
  pageSize: number,
) {
  const merged = { ...params, sort, page, page_size: pageSize };
  return useQuery(dashboardQuery<PostListResponse>(["posts", merged], "/posts", merged));
}

export function useInsightSuggestions(params: Params) {
  return useQuery(
    dashboardQuery<{ suggestions: SuggestedInsight[]; notice: string }>(
      ["insight-suggestions", params],
      "/dashboard/insight-suggestions",
      params,
    ),
  );
}

export function useQueries() {
  return useQuery({
    queryKey: ["queries"],
    queryFn: () => apiRequest<SourceQuery[]>("/queries"),
    staleTime: 60_000,
  });
}

export function useMonitors() {
  return useQuery({
    queryKey: ["monitors"],
    queryFn: () => apiRequest<Monitor[]>("/monitors"),
    staleTime: 30_000,
  });
}

export function useInsights() {
  return useQuery({
    queryKey: ["insights"],
    queryFn: () => apiRequest<Insight[]>("/insights"),
    staleTime: 30_000,
  });
}

export function useReports() {
  return useQuery({
    queryKey: ["reports"],
    queryFn: () => apiRequest<Report[]>("/reports"),
    staleTime: 30_000,
  });
}

export function useTaxonomy() {
  return useQuery({
    queryKey: ["taxonomy"],
    queryFn: () => apiRequest<TaxonomyResponse>("/data/taxonomy"),
    staleTime: 5 * 60_000,
  });
}

export function useKeywordPresets() {
  return useQuery({
    queryKey: ["keyword-presets"],
    queryFn: () => apiRequest<KeywordPreset[]>("/data/keyword-presets"),
    staleTime: 5 * 60_000,
  });
}

export function useConnectors() {
  return useQuery({
    queryKey: ["connectors"],
    queryFn: () => apiRequest<ConnectorsResponse>("/data/connectors"),
    staleTime: 60_000,
  });
}

export function useDataQuality() {
  return useQuery({
    queryKey: ["data-quality"],
    queryFn: () => apiRequest<DataQuality>("/data/quality"),
    staleTime: 60_000,
  });
}

export function useIngestionRuns() {
  return useQuery({
    queryKey: ["ingestion-runs"],
    queryFn: () => apiRequest<IngestionRun[]>("/data/runs", { params: { limit: 15 } }),
    staleTime: 30_000,
  });
}

export function useMethodology() {
  return useQuery({
    queryKey: ["methodology"],
    queryFn: () => apiRequest<MethodologyResponse>("/methodology"),
    staleTime: 5 * 60_000,
  });
}

export function useAuditLog() {
  return useQuery({
    queryKey: ["audit"],
    queryFn: () =>
      apiRequest<{ items: AuditEntry[] }>("/data/audit", {
        params: { limit: 30 },
      }),
    staleTime: 30_000,
  });
}

export function useReportPreview(reportId: string | null) {
  return useQuery({
    queryKey: ["report-preview", reportId],
    queryFn: () => apiRequest<ReportPreview>(`/reports/${reportId}/preview`),
    enabled: Boolean(reportId),
    staleTime: 30_000,
  });
}

export function useUsabilitySummary() {
  return useQuery({
    queryKey: ["usability-summary"],
    queryFn: () =>
      apiRequest<{ items: UsabilitySummaryItem[] }>("/usability/summary"),
    staleTime: 60_000,
  });
}

// ----------------------------------------------------------------- mutations

export function useCreateQuery() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<SourceQuery>) =>
      apiRequest<SourceQuery>("/queries", { method: "POST", body }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["queries"] }),
  });
}

export function useCreateMonitor() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiRequest<Monitor>("/monitors", { method: "POST", body }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["monitors"] });
      client.invalidateQueries({ queryKey: ["queries"] });
    },
  });
}

export function useUpdateMonitor() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiRequest<Monitor>(`/monitors/${id}`, { method: "PATCH", body }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["monitors"] }),
  });
}

export function useDuplicateMonitor() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<Monitor>(`/monitors/${id}/duplicate`, { method: "POST" }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["monitors"] }),
  });
}

export function useCreateInsight() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiRequest<Insight>("/insights", { method: "POST", body }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["insights"] }),
  });
}

export function useUpdateInsight() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiRequest<Insight>(`/insights/${id}`, { method: "PATCH", body }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["insights"] }),
  });
}

export function useDeleteInsight() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest<void>(`/insights/${id}`, { method: "DELETE" }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["insights"] }),
  });
}

export function useCreateReport() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiRequest<Report>("/reports", { method: "POST", body }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["reports"] }),
  });
}

export function useDeleteReport() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest<void>(`/reports/${id}`, { method: "DELETE" }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["reports"] }),
  });
}

export function useImportData() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return apiRequest<ImportResult>("/data/import", { method: "POST", body: form });
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["ingestion-runs"] });
      client.invalidateQueries({ queryKey: ["data-quality"] });
      client.invalidateQueries({ queryKey: ["audit"] });
    },
  });
}

export function useImportPublicX() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (url: string) =>
      apiRequest<ImportResult>("/data/import-public-x", {
        method: "POST",
        body: { url },
      }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["ingestion-runs"] });
      client.invalidateQueries({ queryKey: ["data-quality"] });
      client.invalidateQueries({ queryKey: ["audit"] });
    },
  });
}

/**
 * Tarik post nyata melalui provider X terpilih. Token tidak pernah menyentuh
 * browser — permintaan hanya memicu proses di server.
 */
export function useFetchLive() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (params: { query: string; days: number; max_results: number }) =>
      apiRequest<ImportResult>("/data/fetch-live", { method: "POST", params }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["ingestion-runs"] });
      client.invalidateQueries({ queryKey: ["data-quality"] });
      client.invalidateQueries({ queryKey: ["connectors"] });
      client.invalidateQueries({ queryKey: ["audit"] });
    },
  });
}

export function useReanalyze() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest<IngestionRun>("/data/reanalyze", { method: "POST" }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["ingestion-runs"] });
      client.invalidateQueries({ queryKey: ["data-quality"] });
      client.invalidateQueries({ queryKey: ["audit"] });
    },
  });
}

export function useUpdateTopic() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiRequest(`/data/topics/${id}`, { method: "PATCH", body }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["taxonomy"] });
      client.invalidateQueries({ queryKey: ["audit"] });
    },
  });
}

export function useSaveKeywordPreset() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: Record<string, unknown> }) =>
      id
        ? apiRequest<KeywordPreset>(`/data/keyword-presets/${id}`, { method: "PATCH", body })
        : apiRequest<KeywordPreset>("/data/keyword-presets", { method: "POST", body }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["keyword-presets"] });
      client.invalidateQueries({ queryKey: ["audit"] });
    },
  });
}

export function useDeleteKeywordPreset() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<void>(`/data/keyword-presets/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["keyword-presets"] });
      client.invalidateQueries({ queryKey: ["audit"] });
    },
  });
}

/** Koreksi label. Mengembalikan post terbaru beserta dasar klasifikasinya. */
export function useCorrectLabels() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, body }: { postId: string; body: Record<string, unknown> }) => {
      await apiRequest(`/posts/${postId}/labels`, { method: "PATCH", body });
      return apiRequest<Post>(`/posts/${postId}`);
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["posts"] });
      client.invalidateQueries({ queryKey: ["audit"] });
    },
  });
}

/** Log usability testing — hanya metrik alur, tanpa isi pencarian. */
export function useUsabilityLogger() {
  return useMutation({
    mutationFn: (body: {
      session_key: string;
      task_code?: string;
      event_type: string;
      step_count?: number;
      duration_ms?: number;
      filter_keys?: string[];
    }) => apiRequest("/usability/events", { method: "POST", body }),
  });
}

/** Bangkitkan ulang dataset demo sintetis (hanya saat system ops diaktifkan). */
export function useSeedDemoData() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (params: { count: number; days: number; reset: boolean }) =>
      apiRequest<{ inserted_posts: number; total_posts: number; message: string }>(
        "/data/seed",
        { method: "POST", params },
      ),
    onSuccess: () => client.invalidateQueries(),
  });
}
