import type { ProviderFailure, ScanReport } from "@vibeproof/core";

export interface AiReviewResult {
  enabled: boolean;
  explanations: Array<{ findingId: string; text: string }>;
  failures: ProviderFailure[];
}

export async function reviewFindingsWithGpt(report: ScanReport, enabled: boolean): Promise<AiReviewResult> {
  if (!enabled) {
    return { enabled: false, explanations: [], failures: [] };
  }
  if (!process.env.OPENAI_API_KEY) {
    return {
      enabled: false,
      explanations: [],
      failures: [{ provider: "openai", message: "OPENAI_API_KEY is not configured; static report was generated." }]
    };
  }

  return {
    enabled: false,
    explanations: [],
    failures: [{ provider: "openai", message: "GPT review is reserved for a future release; deterministic results are unchanged." }]
  };
}

