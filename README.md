# Sora (空) - AI Weather & Lifestyle Chatbot

Sora is a voice-enabled AI chatbot designed for the AI Talent Force, Inc. technical assessment. It acts as a daily outing and fashion advisor, providing personalized recommendations based on real-time local weather. Users can interact with Sora in either English or Japanese using only their voice.

https://github.com/vighnesh-007/travel_chat_app/assets/95822134/265355a2-c9ef-4c12-881c-8de1b369e900

## ✨ Features

- **Voice-Driven Interaction**: Full conversation loop (input and output) is handled by voice.
- **Bilingual Support**: Seamlessly switch between English and Japanese for both voice recognition and AI responses.
- **Real-Time Weather**: Integrates with the Open-Meteo API to fetch live weather data based on the user's location.
- **Personalized AI Suggestions**: Uses Groq's Llama 3 model to provide fast, context-aware advice on clothing, activities, and more.
- **Dynamic UI**: Built with Next.js, Tailwind CSS, and shadcn/ui for a modern, responsive, and aesthetically pleasing interface with light/dark modes.
- **Streaming Responses**: AI responses are streamed token-by-token for an engaging user experience.

## 🚀 Live Demo

[A live demo will be hosted on Vercel upon completion.]

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS & shadcn/ui
- **State Management**: React Hooks
- **Internationalization**: `next-intl`
- **Generative AI**: Groq API (Llama 3 8B)
- **AI SDK**: Vercel AI SDK 3.0
- **Weather API**: Open-Meteo
- **Voice I/O**: Web Speech API (SpeechRecognition & SpeechSynthesis)
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

Create a `.env.local` file in the root of the project and add your Groq API key:

```.env.local
GROQ_API_KEY="YOUR_GROQ_API_KEY_HERE"
```

You can get a free API key from the [Groq Console](https://console.groq.com/keys).

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## 🏗️ System Architecture

The application is a monolithic Next.js app.

1.  **Client (Browser)**: The user clicks the microphone button. The Web Speech API listens for voice input in the selected language.
2.  **Geolocation**: Upon successful transcription, the browser's Geolocation API fetches the user's coordinates.
3.  **API Request**: The frontend sends the transcribed text, coordinates, and locale to a Next.js API Route (`/api/getSuggestion`).
4.  **Server (Vercel Function)**:
    a. The API route fetches real-time weather data from Open-Meteo.
    b. It constructs a detailed system prompt containing the weather data and the user's query.
    c. It sends this prompt to the Groq API using the Vercel AI SDK.
5.  **Streaming Response**: The server streams the LLM's response back to the client.
6.  **Text-to-Speech**: The frontend displays the streaming text. Once complete, it uses the Web Speech API to read the text aloud in the appropriate language.
