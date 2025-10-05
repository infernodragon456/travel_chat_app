import { NextRequest, NextResponse } from "next/server";

interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  image?: string;
}

interface GuardedResponse {
  shouldShowResults: boolean;
  results: WebSearchResult[];
}

async function classifyShouldShow(query: string, locale?: string): Promise<boolean> {
  try {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });

    const instruction =
      locale === "ja"
        ? `あなたはメッセージが「情報検索が必要か」を判定する分類器です。単なる挨拶、感謝、謝罪、了承（例: ありがとう、OK、了解、すみません）などの場合は shouldShowResults を false にしてください。旅行先や天気、営業状況、今日のイベントなど、外部情報が役立つ質問や依頼の場合は true にしてください。JSON だけを返してください。例: {"shouldShowResults": true}`
        : `You are a classifier deciding if a message warrants showing web results. If it's just acknowledgement/polite chatter (e.g., thanks, sorry, ok, got it), set shouldShowResults=false. If it asks for info that benefits from web results (e.g., places, events, hours, weather, what's open today, spots for some purpose), set shouldShowResults=true. Return ONLY JSON like {"shouldShowResults": true}.`;

    const completion = await client.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      stream: false,
      temperature: 0,
      messages: [
        { role: "system", content: instruction },
        { role: "user", content: query },
      ],
      max_tokens: 32,
    });

    const content = completion.choices?.[0]?.message?.content ?? "";
    try {
      const parsed = JSON.parse(content);
      return Boolean(parsed?.shouldShowResults);
    } catch {
      return false;
    }
  } catch (err) {
    console.error("Guard classification error:", err);
    return false;
  }
}

async function callInternalWebSearch(query: string, locale?: string): Promise<WebSearchResult[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/webSearch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, locale }),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { results?: WebSearchResult[] };
    return Array.isArray(data?.results) ? data.results : [];
  } catch (err) {
    console.error("Internal webSearch call failed:", err);
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const { query, locale } = (await req.json()) as { query: string; locale?: string };
    if (!query || typeof query !== "string") {
      return NextResponse.json<GuardedResponse>(
        { shouldShowResults: false, results: [] },
        { status: 200 }
      );
    }

    const shouldShowResults = await classifyShouldShow(query, locale);
    if (!shouldShowResults) {
      return NextResponse.json<GuardedResponse>({ shouldShowResults: false, results: [] });
    }

    const results = await callInternalWebSearch(query, locale);
    return NextResponse.json<GuardedResponse>({ shouldShowResults: true, results });
  } catch (error) {
    console.error("Guarded web search internal error:", error);
    return NextResponse.json<GuardedResponse>({ shouldShowResults: false, results: [] }, { status: 200 });
  }
}


