export interface HttpRequestIdOptions {
  /** Header principal para requestId. */
  headerName?: string;
  /** Headers alternativos aceitos para requestId. */
  fallbackHeaderNames?: string[];
  /** Gera requestId quando não vier em headers. */
  autoGenerateIfMissing?: boolean;
}
