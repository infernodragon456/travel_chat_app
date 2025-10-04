import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type Message } from "ai";

export const runtime = "edge";

// Configure the Groq provider
const groq = createOpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  const { messages, lat, lon, locale } = await req.json();

  // Fetch weather data from Open-Meteo
  let weatherData: any = {};
  try {
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max,precipitation_sum,rain_sum&timezone=auto`;
    const weatherRes = await fetch(weatherUrl);
    if (!weatherRes.ok) {
      console.error("Failed to fetch weather data:", weatherRes.statusText);
      // Proceed with a default message if weather fails
    } else {
      weatherData = await weatherRes.json();
    }
  } catch (error) {
    console.error("Error fetching weather data:", error);
    // Proceed with a default message if weather fails
  }

  const systemPrompt = `You are Sora, a friendly and helpful lifestyle assistant. Your goal is to give creative, safe, and personalized advice based on the weather and the user's request.
- ALWAYS respond in the user's language, which is specified by the locale: '${locale}'.
- Use the provided JSON weather data to inform your recommendation for clothing, activities, or travel. Be descriptive. For example, instead of just saying "it's warm", say "it's a warm 25 degrees Celsius".
- Keep your response concise and friendly (2-4 sentences).
- Here is the weather data: ${JSON.stringify(weatherData)}`;

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
      model: groq("llama3-8b-8192"),
      messages: finalMessages,
    });

    // Respond with the stream
    return result.toAIStreamResponse();
  } catch (error) {
    console.error("Error calling Groq API:", error);
    return new Response(
      `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      { status: 500 }
    );
  }
}
