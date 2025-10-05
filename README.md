# Sora (空) - AI Weather & Lifestyle Chatbot

Sora is a voice-enabled AI chatbot designed for the AI Talent Force, Inc. technical assessment. It acts as a daily outing and fashion advisor, providing personalized recommendations based on real-time local weather, and web search results. Users can interact with Sora in either English or Japanese using only their voice, or text.

## ✨ Features

- **Voice & Text Input**: Full conversation via voice (Whisper AI for all browsers) or text input (always available).
- **Bilingual Support**: Seamlessly switch between English and Japanese for both input and AI responses.
- **Location-Based Weather**: Automatically extracts location from your query (e.g., "What should I wear in Tokyo?") and fetches real-time weather data from Open-Meteo.
- **WebSearch based AI Suggestions**: Google's Custom Search Engine for Web Search
- **Modern UI**: Built with Next.js 15, Tailwind CSS, and shadcn/ui for a beautiful, responsive interface with light/dark modes.
- **Streaming Responses**: AI responses are streamed token-by-token for an engaging, real-time experience.
- **Privacy-First**: No geolocation permissions required - just mention a city in your query.

## 🚀 Live Demo

[https://travel-chat-app.vercel.app/](https://travel-chat-app.vercel.app/)

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS 4 & shadcn/ui
- **State Management**: React 19 Hooks
- **Internationalization**: next-intl 4.x
- **Generative AI**: Groq API (Llama 3.1 8B Instant, OpenAI GPT OSS 20B, Llama 4 Scout 17B 16E Instruct)
- **AI SDK**: Vercel AI SDK 3.4
- **Weather API**: Open-Meteo (free, no API key required)
- **Geocoding**: Nominatim/OpenStreetMap
- **Voice I/O**: Whisper Large V3 (Primary) + Web Speech API (Fallback) + Text Input (all browsers), 11Labs for TTS
- **Deployment**: Vercel

## ⚙️ Getting Started

### Prerequisites

- Node.js (v18 or later)
- npm, yarn, or pnpm

### 1. Clone the repository

```bash
git clone https://github.com/vighnesh-007/travel_chat_app.git
cd travel_chat_app
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env.local` file in the root of the project:

```bash
GROQ_API_KEY=
HF_TOKEN=
GOOGLE_CLOUD_TTS_API_KEY=
ELEVENLABS_API_KEY=
GOOGLE_API_KEY=
GOOGLE_CX=
GOOGLE_SERVICE_ACCOUNT_JSON=
```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## 🏗️ System Architecture

The application is a Next.js 15 app with Edge Runtime API routes.

1. **Client (Browser)**:
   - User types or speaks their query (e.g., "What should I wear in Tokyo today?")
   - **Voice Input Architecture**:
     - **Primary**: Records audio → sends to Whisper Large V3 via Hugging Face
     - **Fallback**: Web Speech API (if Whisper unavailable)
     - **Always Available**: Text input
2. **Location Extraction**:
   - The API uses Llama 3 to intelligently extract the location from the query
   - Nominatim/OpenStreetMap geocodes the location to coordinates
3. **Weather Fetching**:
   - Open-Meteo API fetches real-time weather data for the location
4. **AI Response**:
   - The server constructs a detailed prompt with weather data and web search results
   - OpenAI GPT OSS 20B acts as the web search tool caller, and Llama 3.1 8B Instant extracts location from the user prompt and also returns the final output
   - Response is streamed token-by-token back to the client
5. **Output**:
   - Streaming text is displayed in a beautiful chat interface
   - Text-to-Speech reads the response aloud

**Scope for Future:**

- TTS takes the whole text at once, and appears slow to the user. Instead can try to stream the TTS response parallely as assistant generates output
- Web Search guardrails can be improved
- Allow Google Calendar integration for travel plan sync
