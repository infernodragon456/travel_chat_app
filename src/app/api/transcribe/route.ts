// API endpoint for Whisper-based transcription (Firefox support)
// Uses Hugging Face Inference API with Whisper Large V3 Turbo
import { InferenceClient } from "@huggingface/inference";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      return new Response("No audio file provided", { status: 400 });
    }

    // DEBUG: Log audio file details
    console.log("🎤 Audio file details:", {
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size,
      sizeKB: (audioFile.size / 1024).toFixed(2) + " KB",
    });

    // Validate audio file size
    if (audioFile.size < 1000) {
      console.error("❌ Audio file too small (< 1KB)");
      return new Response(
        JSON.stringify({
          error:
            "Audio recording too short or empty. Please record for at least 1 second.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (audioFile.size > 25 * 1024 * 1024) {
      console.error("❌ Audio file too large (> 25MB)");
      return new Response(
        JSON.stringify({
          error: "Audio file too large. Maximum size is 25MB.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check if Hugging Face API token is available
    if (!process.env.HF_TOKEN) {
      return new Response(
        JSON.stringify({
          error:
            "Hugging Face API token not configured. Please add HF_TOKEN to your .env.local file.",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Initialize Hugging Face Inference Client
    const client = new InferenceClient(process.env.HF_TOKEN);

    // Convert to Blob while PRESERVING the MIME type
    // ArrayBuffer loses MIME type info, which causes "Content type None" error
    const audioBuffer = await audioFile.arrayBuffer();
    const audioBlob = new Blob([audioBuffer], { type: audioFile.type });

    console.log("📊 Audio blob for HF:", {
      size: audioBlob.size,
      type: audioBlob.type,
    });

    // Get locale from form data (if provided)
    const locale = (formData.get("locale") as string) || "en";
    const languageCode = locale === "ja" ? "japanese" : "english";

    console.log("🌐 Transcribing in:", languageCode);

    // Transcribe using Whisper Large V3 Turbo via Hugging Face
    // Note: HF Inference API doesn't support language parameter directly
    // The model should auto-detect, but we log it for debugging
    const result = await client.automaticSpeechRecognition({
      data: audioBlob,
      model: "openai/whisper-large-v3",
    });

    console.log("✅ Transcription result:", result);

    // Check if transcription is suspiciously short (hallucination detection)
    if (
      result.text &&
      result.text.trim().length < 3 &&
      audioFile.size > 10000
    ) {
      console.warn("⚠️ Suspicious transcription (too short for audio size)");
    }

    return new Response(JSON.stringify({ text: result.text }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Transcription error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
