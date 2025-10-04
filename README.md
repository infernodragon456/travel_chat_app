# Sora (空) - AI Weather & Lifestyle Chatbot

Sora is a voice-enabled AI chatbot designed for the AI Talent Force, Inc. technical assessment. It acts as a daily outing and fashion advisor, providing personalized recommendations based on real-time local weather. Users can interact with Sora in either English or Japanese using only their voice.

https://github.com/vighnesh-007/travel_chat_app/assets/95822134/265355a2-c9ef-4c12-881c-8de1b369e900

## ✨ Features

- **Voice & Text Input**: Full conversation via voice (Chrome/Edge) or text input (all browsers including Firefox).
- **Bilingual Support**: Seamlessly switch between English and Japanese for both input and AI responses.
- **Location-Based Weather**: Automatically extracts location from your query (e.g., "What should I wear in Tokyo?") and fetches real-time weather data from Open-Meteo.
- **Personalized AI Suggestions**: Uses Groq's Llama 3 model to provide fast, context-aware advice on clothing, activities, and travel.
- **Modern UI**: Built with Next.js 15, Tailwind CSS, and shadcn/ui for a beautiful, responsive interface with light/dark modes.
- **Streaming Responses**: AI responses are streamed token-by-token for an engaging, real-time experience.
- **Privacy-First**: No geolocation permissions required - just mention a city in your query.

## 🚀 Live Demo

[A live demo will be hosted on Vercel upon completion.]

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS 4 & shadcn/ui
- **State Management**: React 19 Hooks
- **Internationalization**: next-intl 4.x
- **Generative AI**: Groq API (Llama 3.1 8B Instant)
- **AI SDK**: Vercel AI SDK 3.4
- **Weather API**: Open-Meteo (free, no API key required)
- **Geocoding**: Nominatim/OpenStreetMap
- **Voice I/O**: Web Speech API (Chrome/Edge) + Text Input (all browsers)
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
# Required: Groq API Key
GROQ_API_KEY=your_groq_api_key_here

# Optional: OpenAI API Key (for Whisper transcription in Firefox)
# OPENAI_API_KEY=your_openai_api_key_here
```

**Get your API keys:**

- Groq (Required): [https://console.groq.com/keys](https://console.groq.com/keys)
- OpenAI (Optional): [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## 🏗️ System Architecture

The application is a Next.js 15 app with Edge Runtime API routes.

1. **Client (Browser)**:
   - User types or speaks their query (e.g., "What should I wear in Tokyo today?")
   - Web Speech API (Chrome/Edge) or text input (all browsers)
2. **Location Extraction**:
   - The API uses Llama 3 to intelligently extract the location from the query
   - Nominatim/OpenStreetMap geocodes the location to coordinates
3. **Weather Fetching**:
   - Open-Meteo API fetches real-time weather data for the location
4. **AI Response**:
   - The server constructs a detailed prompt with weather data
   - Groq API (Llama 3.1 8B Instant) generates personalized suggestions
   - Response is streamed token-by-token back to the client
5. **Output**:
   - Streaming text is displayed in a beautiful chat interface
   - Text-to-Speech reads the response aloud (if supported)

**Key Features:**

- ✅ No geolocation permissions required
- ✅ Works in any browser (text input)
- ✅ Voice input in Chrome/Edge
- ✅ Optional Whisper API support for Firefox voice input
