import { createOpenAI } from "@ai-sdk/openai";
import { streamText, StreamData, generateText } from "ai";
import { StreamingTextResponse } from "ai";
// zod no longer needed here

export const runtime = "edge";

const groq = createOpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY,
});
type WebSearchResult = {
  title: string;
  url: string;
  snippet: string;
  image?: string;
};
// --- HELPER FUNCTIONS ---


// Geocodes a location name to latitude and longitude using OpenStreetMap
async function geocodeLocation(
  locationName: string
): Promise<{ lat: number; lon: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      locationName
    )}&format=json&limit=1`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "SoraAIApp/1.0", // A unique user-agent is required by this API
      },
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
      };
    }
    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

// Extracts a location name from the user's message using a fast LLM
async function extractLocation(
  userMessage: string,
  locale: string
): Promise<string | null> {
  try {
    const prompt =
      locale === "ja"
        ? `以下のメッセージから都市名または場所を抽出してください。場所が見つからない場合は「NONE」と返してください。場所名のみを返してください。\n\nメッセージ: "${userMessage}"\n\n場所:`
        : `Extract the city or location name from the following message. If no location is found, return "NONE". Return ONLY the location name.\n\nMessage: "${userMessage}"\n\nLocation:`;

    const { text } = await generateText({
      model: groq("llama-3.1-8b-instant"),
      prompt,
      maxTokens: 50,
    });

    const location = text.trim();
    if (location && location.toUpperCase() !== "NONE" && location.length > 0) {
      return location;
    }
    return null;
  } catch (error) {
    console.error("Location extraction error:", error);
    return null;
  }
}

// Performs a web search using our internal /api/webSearch endpoint
async function searchTheWeb(query: string, locale: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/webSearch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, locale }),
    });

    if (!response.ok) {
      console.error("Internal search API failed:", response.status);
      return { results: [] };
    }
    return await response.json();
  } catch (error) {
    console.error("Critical error calling internal search API:", error);
    return { results: [] };
  }
}

// --- MAIN API ENDPOINT ---

export async function POST(req: Request) {
  const { messages, locale } = await req.json();
  const data = new StreamData();

  // --- Step 1: Weather & Location Fetching (Strict Requirement) ---
  const lastUserMessage = messages[messages.length - 1]?.content || "";
  const locationName = await extractLocation(lastUserMessage, locale);
  let weatherData: Record<string, unknown> | null = null;

  if (locationName) {
    const coordinates = await geocodeLocation(locationName);
    if (coordinates) {
      try {
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${coordinates.lat}&longitude=${coordinates.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
        const weatherRes = await fetch(weatherUrl);
        if (weatherRes.ok) {
          weatherData = await weatherRes.json();
          console.log("Weather data:", weatherData);
        }
      } catch (error) {
        console.error("Error fetching weather data:", error);
      }
    }
  }

  // --- Step 2: Web Search Tool Call (using a powerful model) ---
  let webSearchResults: WebSearchResult[] = [];
  try {
    console.log("Starting web search tool call via Groq client...");

    // Lazy import OpenAI to avoid type resolution issues on edge runtime
    const { default: OpenAI } = await import("openai");
    const groqClient = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });

    const toolsSystemInstruction =
      "Use get_web_search_results to fetch current info. Do not answer without calling the tool at least once.";

    const completionPromise = groqClient.chat.completions.create({
      model: "openai/gpt-oss-20b",
      stream: false,
      messages: [
        { role: "system", content: toolsSystemInstruction },
        ...messages,
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "get_web_search_results",
            description: "Get up-to-date information from the web.",
            parameters: {
              type: "object",
              properties: {
                query: { type: "string" },
              },
              required: ["query"],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "get_web_search_results" } },
      temperature: 0.2,
      top_p: 0.95,
      max_tokens: 512,
    });

    const completion = await Promise.race([
      completionPromise,
      new Promise((resolve) => setTimeout(() => resolve(null), 10000)),
    ]);

    if (completion && typeof completion === "object") {
      type GroqToolCall = { type: "function"; function?: { name: string; arguments?: string } };
      type GroqChatCompletion = { choices?: { message?: { tool_calls?: GroqToolCall[] } }[] };
      const c = completion as GroqChatCompletion;
      const toolCalls = c.choices?.[0]?.message?.tool_calls;
      if (Array.isArray(toolCalls) && toolCalls.length > 0) {
        for (const call of toolCalls) {
          if (call.type === "function" && call.function?.name === "get_web_search_results") {
            try {
              const args = call.function.arguments ? JSON.parse(call.function.arguments) : { query: lastUserMessage };
              const query = typeof args?.query === "string" && args.query.trim().length > 0 ? args.query : lastUserMessage;
              const searchData = await searchTheWeb(query, locale);
              if (searchData && Array.isArray(searchData.results)) {
                webSearchResults = searchData.results as WebSearchResult[];
                if (webSearchResults.length > 0) {
                  data.append(JSON.stringify({ webSearchResults }));
                }
              }
            } catch (err) {
              console.error("Error executing web search tool call:", err);
            }
          }
        }
      } else {
        console.warn("Groq did not return tool_calls; continuing without web results.");
      }
    } else {
      console.warn("Groq tool phase timed out; continuing without web results.");
    }
  } catch (error) {
    console.error("Tool call for web search failed:", error);
  }

  // --- Step 3: Final Text Generation (using a fast model) ---
  const systemPrompt = locale === "ja"
    ? `あなたはSora（ソラ）、親しみやすく役立つライフスタイルアシスタントです...` // (rest of your prompt)
    : `You are Sora, a friendly and helpful lifestyle assistant...`; // (rest of your prompt)

  // Construct a final context with all gathered information
  const finalContext = `
    ${systemPrompt}

    ADDITIONAL CONTEXT TO INFORM YOUR RESPONSE:
    - Location Name: ${locationName || "Not specified"}
    - Weather Data: ${JSON.stringify(weatherData) || "Not available"}
    - Web Search Results: ${JSON.stringify(webSearchResults) || "Not available"}
    
    Based on all of this context and the user's conversation history, provide a concise, friendly, and helpful response.
  `;
  
  console.log("Starting final text generation with llama-3.1-8b-instant... with system:", finalContext);
  const result = await streamText({
    model: groq("llama-3.1-8b-instant"),
    system: finalContext,
    messages: messages,
    // ✅ FIX 3: Moved onFinish inside the streamText configuration object
    onFinish: () => {
      data.close();
    },
  });
  
  return new StreamingTextResponse(result.toAIStream(), {}, data);
}