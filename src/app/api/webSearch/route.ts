import { NextRequest, NextResponse } from "next/server";
import { JWT } from "google-auth-library";

// A consistent interface for our search results (no change needed here)
interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  image?: string;
}

// Minimal Google Custom Search response types (only the fields we use)
interface GoogleCseImage {
  src: string;
}

interface GooglePagemap {
  cse_image?: GoogleCseImage[];
}

interface GoogleItem {
  title: string;
  link: string;
  snippet: string;
  pagemap?: GooglePagemap;
}

interface GoogleResponse {
  items?: GoogleItem[];
}

async function getAccessToken() {
  const credentialsJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!credentialsJson) {
    throw new Error("Google service account credentials are not set.");
  }
  
  const credentials = JSON.parse(credentialsJson);

  // Define the scope required for the Custom Search API
  const scopes = ["https://www.googleapis.com/auth/cse"];
  
  const auth = new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: scopes,
  });

  const accessToken = await auth.getAccessToken();
  return accessToken.token;
}


export async function POST(req: NextRequest) {
  try {
    const { query, locale } = (await req.json()) as {
      query: string;
      locale?: string;
    };
    console.log("Google Search API called with query:", query, "locale:", locale);

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const searchEngineId = process.env.GOOGLE_CX;

    if (!searchEngineId) {
      console.error("Google Search Engine ID (CX) is not set");
      return NextResponse.json({ error: "Search API is not configured." }, { status: 500 });
    }

    // Get an OAuth2 access token
    const token = await getAccessToken();

    // Construct the Google Custom Search API URL (without the API key)
    const url = new URL("https://www.googleapis.com/customsearch/v1");
    url.searchParams.set("cx", searchEngineId);
    url.searchParams.set("q", query);
    url.searchParams.set("num", "3");

    if (locale === "ja") {
      url.searchParams.set("lr", "lang_ja");
      url.searchParams.set("cr", "countryJP");
    }

    const response = await fetch(url.toString(), {
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.error("Google API Error:", await response.text());
      return NextResponse.json({ error: "Failed to fetch from search API" }, { status: 500 });
    }

    const data: GoogleResponse = await response.json();

    // Map the Google API response to our simple, consistent format
    const results: WebSearchResult[] = (data.items ?? [])
      .slice(0, 3)
      .map((item: GoogleItem) => ({
        title: item.title,
        url: item.link,
        snippet: item.snippet,
        // Safely access the thumbnail image from the pagemap
        image: item.pagemap?.cse_image?.[0]?.src,
      }));

    console.log('Returning web search results:', results);
    return NextResponse.json({ results });

  } catch (error) {
    console.error("Web search internal error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}