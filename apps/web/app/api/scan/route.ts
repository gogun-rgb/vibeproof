import { NextResponse } from "next/server";
import { runScan } from "@vibeproof/orchestrator";
import { toMarkdown, toPublicJson } from "@vibeproof/report";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { target?: string };
    const target = body.target?.trim();
    if (!target) {
      return NextResponse.json({ error: "Target is required." }, { status: 400 });
    }
    const url = new URL(target);
    if (url.protocol !== "https:" || url.hostname !== "github.com") {
      return NextResponse.json({ error: "The web UI accepts public https://github.com/owner/repo URLs." }, { status: 400 });
    }

    const report = await runScan(target, { noAi: true });
    const publicJson = JSON.parse(toPublicJson(report)) as unknown;
    return NextResponse.json({
      report: publicJson,
      markdown: toMarkdown(report)
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Scan failed." },
      { status: 400 }
    );
  }
}

