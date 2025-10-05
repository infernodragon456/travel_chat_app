import { createOpenAI } from "@ai-sdk/openai";
import { streamText, generateText, type Message } from "ai";

export const runtime = "edge";

// Configure the Groq provider
const groq = createOpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY,
});

// Geocoding function to convert location name to coordinates
async function geocodeLocation(
  locationName: string
): Promise<{ lat: number; lon: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      locationName
    )}&format=json&limit=1`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "SoraWeatherApp/1.0",
      },
    });
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

// Extract location from user query using LLM
async function extractLocation(
  userMessage: string,
  locale: string
): Promise<string | null> {
  try {
    const prompt =
      locale === "ja"
        ? `以下のメッセージから都市名または場所を抽出してください。場所が見つからない場合は「NONE」と返してください。場所名のみを返してください。

メッセージ: "${userMessage}"

場所:`
        : `Extract the city or location name from the following message. If no location is found, return "NONE". Return ONLY the location name.

Message: "${userMessage}"

Location:`;

    const { text } = await generateText({
      model: groq("llama-3.1-8b-instant"),
      prompt,
      maxTokens: 50,
    });

    const location = text.trim();
    if (location && location !== "NONE" && location.length > 0) {
      return location;
    }
    return null;
  } catch (error) {
    console.error("Location extraction error:", error);
    return null;
  }
}

export async function POST(req: Request) {
  const { messages, locale } = await req.json();

  // Get the last user message
  const lastUserMessage = messages[messages.length - 1]?.content || "";

  // Extract location from user query
  const locationName = await extractLocation(lastUserMessage, locale);

  let weatherData: Record<string, unknown> = {};
  let locationInfo = "";

  if (locationName) {
    console.log("Extracted location:", locationName);

    // Geocode the location
    const coordinates = await geocodeLocation(locationName);

    if (coordinates) {
      console.log("Coordinates:", coordinates);
      locationInfo = locationName;

      // Fetch weather data from Open-Meteo
      try {
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${coordinates.lat}&longitude=${coordinates.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max,precipitation_sum,rain_sum&timezone=auto`;
        const weatherRes = await fetch(weatherUrl);

        if (weatherRes.ok) {
          weatherData = await weatherRes.json();
        } else {
          console.error("Failed to fetch weather data:", weatherRes.statusText);
        }
      } catch (error) {
        console.error("Error fetching weather data:", error);
      }
    } else {
      console.log("Could not geocode location:", locationName);
    }
  }

  const systemPrompt =
    locale === "ja"
      ? `あなたはSora（ソラ）、親しみやすく役立つライフスタイルアシスタントです。天気とユーザーのリクエストに基づいて、創造的で安全でパーソナライズされたアドバイスを提供することが目標です。

重要な指示：
- 必ず日本語で返答してください。
${
  locationInfo
    ? `- ${locationInfo}の現在の天気データ: ${JSON.stringify(weatherData)}`
    : "- 天気データが利用できない場合は、ユーザーに都市名を尋ねるか、一般的なアドバイスを提供してください。"
}
- **必ず天気情報を含めてください**。例：「現在の気温は19.5度で、湿度が高いです」
- 天気に基づいた具体的な推奨（服装、アクティビティ、持ち物など）を提供してください。
- 返答は簡潔でフレンドリーに（2〜4文程度）。リスト形式ではなく、自然な会話形式で。
- 長いリストや番号付きリストは避けてください。`
      : `You are Sora, a friendly and helpful lifestyle assistant. Your goal is to give creative, safe, and personalized advice based on the weather and the user's request.

Important instructions:
- ALWAYS respond in English.
${
  locationInfo
    ? `- Current weather data for ${locationInfo}: ${JSON.stringify(
        weatherData
      )}`
    : "- If no weather data is available, ask the user for a city name or provide general advice."
}
- **Always mention the weather conditions**. Example: "It's currently 19.5°C with high humidity"
- Provide specific recommendations (clothing, activities, items to bring) based on the weather.
- Keep your response concise and friendly (2-4 sentences). Use natural conversation style, not lists.
- Avoid long numbered lists.`;

  // Prepend the system message to the user's messages
  const finalMessages: Message[] = [
    {
      role: "system",
      content: systemPrompt,
    },
    ...messages,
  ];

  try {
    const result = await streamText({
      model: groq("llama-3.1-8b-instant"),
      messages: finalMessages,
    });

    // Return the standard AI SDK response
    return result.toAIStreamResponse();
  } catch (error) {
    console.error("Error calling Groq API:", error);
    return new Response(
      `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      { status: 500 }
    );
  }
}
