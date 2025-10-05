
export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const { text, locale } = await req.json();

    if (!text) {
      return new Response("No text provided", { status: 400 });
    }

    if (process.env.ELEVENLABS_API_KEY) {
      try {
        return await generateWithElevenLabs(text, locale);
      } catch (error) {
        console.error("ElevenLabs TTS failed:", error);
      }
    }

    return new Response(
      JSON.stringify({
        error:
          "ElevenLabs API not configured. Add ELEVENLABS_API_KEY to .env.local",
        fallback: true,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("TTS generation error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        fallback: true,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

async function generateWithElevenLabs(text: string, locale: string) {
  const apiKey = process.env.ELEVENLABS_API_KEY!;

  // Multilingual v2 model supports Japanese and English
  const voiceId =
    locale === "ja"
      ? "GxxMAMfQkDlnqjpzjLHH" // Rachel - works well for Japanese with multilingual model
      : "pNInz6obpgDQGcFmaJgB"; // Adam - natural English voice

  const requestBody = {
    text,
    model_id: "eleven_multilingual_v2", 
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.0,
      use_speaker_boost: true,
    },
  };

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("ElevenLabs TTS error details:", errorText);
    throw new Error(`ElevenLabs TTS API error: ${response.statusText}`);
  }

  const audioBuffer = await response.arrayBuffer();
  const base64Audio = Buffer.from(audioBuffer).toString("base64");

  return new Response(JSON.stringify({ audioContent: base64Audio }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
