import { NextResponse } from "next/server";
import { runScan } from "@vibeproof/orchestrator";
import { toMarkdown, toPublicJson } from "@vibeproof/report";

export const runtime = "nodejs";

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function isJsonRequest(request: Request): boolean {
  const contentType = request.headers.get("content-type") ?? "";
  return contentType.toLowerCase().includes("application/json");
}

export async function POST(request: Request) {
  try {
    if (!isJsonRequest(request)) {
      return NextResponse.json({ error: "Content-Type must be application/json." }, { status: 415 });
    }

    const body = readScanRequest(await readJson(request));
    const target = body.target.trim();
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
    return NextResponse.json({ error: safeErrorMessage(error) }, { status: 400 });
  }
}

function readScanRequest(value: unknown): { target: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { target: "" };
  }

  const target = (value as { target?: unknown }).target;
  return { target: typeof target === "string" && target.length <= 300 ? target : "" };
}

function safeErrorMessage(error: unknown): string {
  if (error instanceof Error && /GitHub|Target|URL|HTTP \d{3}|public https/.test(error.message)) {
    return error.message;
  }

  return "Scan failed.";
}

