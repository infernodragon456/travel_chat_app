// API endpoint for Whisper-based transcription using official Hugging Face Inference API
// Uses direct fetch to HF Inference API with proper FormData format
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

    // Get locale from form data (if provided)
    const locale = (formData.get("locale") as string) || "en";
    const languageCode = locale === "ja" ? "japanese" : "english";

    console.log("🌐 Transcribing in:", languageCode);

    // Convert audio file to ArrayBuffer for binary upload
    const audioBuffer = await audioFile.arrayBuffer();

    console.log("📤 Sending to HF Inference API:", {
      fileName: audioFile.name,
      fileType: audioFile.type,
      fileSize: audioFile.size,
      bufferSize: audioBuffer.byteLength,
    });

    // Call Hugging Face Inference API with binary audio data
    const response = await fetch(
      "https://api-inference.huggingface.co/models/openai/whisper-large-v3",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.HF_TOKEN}`,
          "Content-Type": "audio/wav", // Send as binary audio data
        },
        body: audioBuffer, // Send raw binary data
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ HF API error:", response.status, errorText);
      return new Response(
        JSON.stringify({
          error: `Hugging Face API error: ${response.status} ${errorText}`,
        }),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    console.log("✅ Transcription result:", result);

    // Extract text from HF API response
    let transcriptionText = "";
    if (result.text) {
      transcriptionText = result.text;
    } else if (result.transcription) {
      transcriptionText = result.transcription;
    } else if (typeof result === "string") {
      transcriptionText = result;
    }

    // Check if transcription is suspiciously short (hallucination detection)
    if (
      transcriptionText &&
      transcriptionText.trim().length < 3 &&
      audioFile.size > 10000
    ) {
      console.warn("⚠️ Suspicious transcription (too short for audio size)");
    }

    return new Response(JSON.stringify({ text: transcriptionText }), {
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
