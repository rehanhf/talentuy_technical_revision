/** Tipe bersama yang mencerminkan skema response API TalentPulse. */

export type Role = "admin" | "analyst" | "viewer";
export type HumanStatus = "draft" | "reviewed" | "approved";
export type SentimentLabel = "Positif" | "Netral" | "Negatif" | "Tidak Yakin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  is_active: boolean;
}

export interface ResponseMeta {
  record_count: number;
  period_start: string;
  period_end: string;
  period_label: string;
  comparison_start: string;
  comparison_end: string;
  data_source_mode: "demo" | "live";
  is_synthetic: boolean;
  last_updated: string | null;
  is_stale: boolean;
  model_version: string;
  search_provider: string;
  applied_filters: Record<string, unknown>;
}

export interface SeriesPoint {
  date: string;
  count: number;
  indexed?: number;
}

export interface Peak {
  date: string;
  count: number;
  baseline: number;
  z_score: number | null;
  delta_percent: number | null;
}

export interface TopicRow {
  slug: string;
  name: string;
  color: string;
  count: number;
  share: number;
  previous_count: number;
  change_percent: number | null;
  avg_engagement: number;
  sentiment_counts: Record<string, number>;
  dominant_sentiment: SentimentLabel;
  negative_share: number;
}

export interface AttentionIssue extends TopicRow {
  attention_score: number;
  reasons: string[];
}

export interface LabelCount {
  label: string;
  count: number;
  share: number;
  change_percent?: number | null;
}

export interface SentimentByRole {
  job_role: string;
  total: number;
  Positif: number;
  Netral: number;
  Negatif: number;
  "Tidak Yakin": number;
  negative_share: number;
}

export interface HeatmapCell {
  job_role: string;
  topic: string;
  count: number;
  share_of_role: number;
}

export interface Heatmap {
  rows: string[];
  columns: string[];
  cells: HeatmapCell[];
  max_count: number;
}

export interface QuestionItem {
  external_post_id: string;
  text: string;
  created_at: string;
  job_role: string;
  topic: string;
  relevance_score: number;
  engagement_score: number;
  sentiment_label: SentimentLabel;
}

export interface Kpi<T> {
  value: T;
  [key: string]: unknown;
}

export interface OverviewKpis {
  total_posts: { value: number; previous: number; change_percent: number | null };
  volume_change: { value: number | null; previous_period_total: number };
  active_topics: { value: number; threshold: number; total_topics: number };
  dominant_sentiment: { value: string; share: number; distribution: LabelCount[] };
  detected_questions: {
    value: number;
    previous: number;
    change_percent: number | null;
    share: number;
  };
  top_job_role: {
    value: string;
    count: number;
    share: number;
    change_percent: number | null;
  };
}

export interface OverviewResponse {
  kpis: OverviewKpis;
  volume_series: SeriesPoint[];
  peaks: Peak[];
  topics: TopicRow[];
  sentiment_by_role: SentimentByRole[];
  heatmap: Heatmap;
  attention_issues: AttentionIssue[];
  top_questions: QuestionItem[];
  intents: LabelCount[];
  job_roles: LabelCount[];
  limitations: string[];
  meta: ResponseMeta;
}

export interface TrendsResponse {
  granularity: "daily" | "weekly";
  series: SeriesPoint[];
  previous_series: SeriesPoint[];
  comparison: {
    current_total: number;
    previous_total: number;
    change_percent: number | null;
  };
  breakdown_type: string;
  breakdown: Array<TopicRow | LabelCount>;
  peaks: Peak[];
  annotations: Array<{ date: string; label: string; note: string }>;
  meta: ResponseMeta;
}

export interface KeywordGraph {
  nodes: Array<{ id: string; label: string; count: number }>;
  edges: Array<{ source: string; target: string; weight: number }>;
}

/** Satu kartu kombinasi kategori isu x jenis pekerjaan. */
export interface TopicRolePartition {
  topic_slug: string;
  topic_name: string;
  color: string;
  job_role: string;
  count: number;
  questions: number;
  share: number;
  negative_share: number;
}

export interface TopicsResponse {
  topics: TopicRow[];
  partitions: TopicRolePartition[];
  total_posts: number;
  related_keywords: KeywordGraph;
  questions: QuestionItem[];
  meta: ResponseMeta;
}

export interface TopicDetailResponse {
  topic: TopicRow | null;
  series: SeriesPoint[];
  peaks: Peak[];
  sentiment: LabelCount[];
  intents: LabelCount[];
  job_roles: LabelCount[];
  related_keywords: KeywordGraph;
  questions: QuestionItem[];
  suggested_summary: string;
  meta: ResponseMeta;
}

export type LabelField = "topic" | "sentiment" | "intent" | "job_role";

/** Dasar penetapan satu label: aturan yang terpicu dan kata pemicunya. */
export interface LabelExplanation {
  rule: string;
  triggers: string[];
  corrected: boolean;
  auto_rule: string;
}

export interface Post {
  id: string;
  external_post_id: string;
  text: string;
  created_at_source: string;
  language: string;
  source: string;
  url: string | null;
  is_synthetic: boolean;
  like_count: number;
  repost_count: number;
  reply_count: number;
  quote_count: number;
  engagement_score: number;
  sentiment_label: SentimentLabel;
  intent_label: string;
  job_role: string;
  topic_slug: string | null;
  topic_name: string | null;
  relevance_score: number;
  needs_review: boolean;
  keywords: string[];
  explanation: Partial<Record<LabelField, LabelExplanation>>;
  sentiment_confidence: number | null;
  intent_confidence: number | null;
  model_version: string | null;
}

export interface PostListResponse {
  items: Post[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  highlight_terms: string[];
  meta: ResponseMeta;
}

export interface SourceQuery {
  id: string;
  name: string;
  query_text: string;
  include_keywords: string[];
  exclude_keywords: string[];
  job_roles: string[];
  topics: string[];
  sentiments: string[];
  intents: string[];
  owner_name: string | null;
  is_saved: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface Monitor {
  id: string;
  name: string;
  owner_name: string | null;
  comparison_window: number;
  is_active: boolean;
  is_archived: boolean;
  created_at: string;
  source_query: SourceQuery;
  current_count: number;
  previous_count: number;
  change_percent: number | null;
  trend_direction: "naik" | "turun" | "stabil" | "tidak cukup data";
  sparkline: SeriesPoint[];
}

export interface Insight {
  id: string;
  title: string;
  summary: string;
  human_note: string;
  evidence_filters: Record<string, unknown>;
  metric_snapshot: Record<string, unknown>;
  /** Komentar peninjau; bukan isi insight dan tidak diekspor. */
  review_comment: string;
  human_status: HumanStatus;
  is_synthetic_data: boolean;
  author_name: string | null;
  created_by: string | null;
  last_edited_by: string | null;
  first_approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SuggestedInsight {
  title: string;
  summary: string;
  evidence_filters: Record<string, unknown>;
  metric_snapshot: Record<string, unknown>;
}

export interface Report {
  id: string;
  title: string;
  period_start: string;
  period_end: string;
  insight_ids: string[];
  charts: string[];
  notes: string;
  query_snapshot: Record<string, unknown>;
  author_name: string | null;
  generated_at: string;
  insights: Insight[];
}

export interface TopicMeta {
  id: string;
  slug: string;
  name: string;
  description: string;
  color: string;
  keywords: string[];
  is_active: boolean;
}

export interface KeywordPreset {
  id: string;
  topic_slug: string;
  topic_name: string;
  label: string;
  query_text: string;
  sort_order: number;
  is_active: boolean;
}

export interface TaxonomyResponse {
  topics: TopicMeta[];
  job_roles: string[];
  job_role_codes: Record<string, string>;
  intents: string[];
  sentiments: string[];
  languages: string[];
  limitations: string[];
  engagement_formula: string;
}

export interface ConnectorStatus {
  name: string;
  label: string;
  description: string;
  available: boolean;
}

export interface ConnectorsResponse {
  provider: "official" | "twitterapi_io";
  mode: "demo" | "live";
  requested_mode: string;
  live_available: boolean;
  connectors: ConnectorStatus[];
  system_ops_enabled: boolean;
  notice: string;
}

export interface DataQuality {
  total_posts: number;
  analyzed_posts: number;
  coverage_percent: number;
  unclassified_topic: number;
  unclassified_percent: number;
  needs_review: number;
  needs_review_percent: number;
  uncertain_sentiment: number;
  uncertain_percent: number;
  synthetic_posts: number;
  synthetic_percent: number;
  earliest_post: string | null;
  latest_post: string | null;
}

export interface IngestionRun {
  id: string;
  source: string;
  started_at: string;
  completed_at: string | null;
  records_received: number;
  records_processed: number;
  records_failed: number;
  status: string;
  error_summary: string;
}

export interface MethodologyResponse {
  data_source_mode: "demo" | "live";
  is_synthetic: boolean;
  collection: string;
  processing: string;
  engagement_formula: string;
  ethics: string[];
  limitations: string[];
  freshness: {
    last_updated: string | null;
    latest_post_at: string | null;
    total_posts: number;
    synthetic_posts: number;
    is_stale: boolean;
    search_provider: string;
  };
}

export interface ReportChartData {
  key: string;
  title: string;
  columns: string[];
  rows: Array<Array<string | number>>;
}

export interface ReportPreview {
  title: string;
  period_start: string;
  period_end: string;
  generated_at: string;
  data_source_mode: "demo" | "live";
  is_synthetic: boolean;
  query_snapshot: Record<string, unknown>;
  statistics: Record<string, string | number>;
  charts_data: ReportChartData[];
  notes: string;
  insights: Array<{
    title: string;
    summary: string;
    human_note: string;
    human_status: HumanStatus;
  }>;
  generated_now: string;
}

export interface UsabilitySummaryItem {
  task_code: string;
  event_type: string;
  count: number;
  avg_duration_ms: number;
  avg_steps: number;
}

export interface AuditEntry {
  id: string;
  actor_email: string;
  action: string;
  entity: string;
  entity_id: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
}

export interface ImportResult {
  run_id: string;
  records_received: number;
  records_processed: number;
  records_failed: number;
  status: string;
  errors: string[];
}
