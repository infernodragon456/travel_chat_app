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

    // Convert audio file to blob (HF Inference accepts Blob or ArrayBuffer)
    const audioBuffer = await audioFile.arrayBuffer();
    const audioBlob = new Blob([audioBuffer], { type: audioFile.type });

    // Transcribe using Whisper Large V3 Turbo via Hugging Face
    const result = await client.automaticSpeechRecognition({
      data: audioBlob,
      model: "openai/whisper-large-v3-turbo",
    });

    console.log("Transcription result:", result);

    return new Response(JSON.stringify({ text: result.text }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Transcription error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
