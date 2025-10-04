import { notFound } from "next/navigation";
import { getRequestConfig } from "next-intl/server";

const locales = ["en", "ja"] as const;

export default getRequestConfig(async ({ requestLocale }) => {
  // Next.js 15: requestLocale is a Promise
  const locale = await requestLocale;

  console.log("🌐 i18n.ts - Resolved locale:", locale);
  console.log("🌐 i18n.ts - Type of locale:", typeof locale);

  // Validate that the locale is one of the supported locales
  if (!locale || !locales.includes(locale as "en" | "ja")) {
    console.log("❌ i18n.ts - Invalid locale, calling notFound()");
    notFound();
  }

  console.log("✅ i18n.ts - Loading messages for locale:", locale);
  return {
    locale: locale as string,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
