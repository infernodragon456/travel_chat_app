"use client";

import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";

interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  image?: string;
}

interface WebResultCardProps {
  result: WebSearchResult;
}

export function WebResultCard({ result }: WebResultCardProps) {
  const handleClick = () => {
    window.open(result.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div 
      className="bg-card border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer group"
      onClick={handleClick}
    >
      <div className="flex gap-3">
        {result.image && (
          <div className="flex-shrink-0">
            <Image
              src={result.image}
              alt={result.title}
              width={64}
              height={64}
              className="w-16 h-16 object-cover rounded-md"
              onError={(e) => {
                // Hide image if it fails to load
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2">
              {result.title}
            </h3>
            <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-0.5" />
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-3">
            {result.snippet}
          </p>
        </div>
      </div>
    </div>
  );
}

interface WebResultCardsProps {
  results: WebSearchResult[];
}

export function WebResultCards({ results }: WebResultCardsProps) {
  const t = useTranslations("Sora");
  
  if (!results || results.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 space-y-3">
      <h4 className="text-sm font-medium text-muted-foreground">{t("related_resources")}</h4>
      <div className="grid gap-3">
        {results.map((result, index) => (
          <WebResultCard key={index} result={result} />
        ))}
      </div>
    </div>
  );
}
