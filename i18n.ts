import { notFound } from "next/navigation";
import { getRequestConfig } from "next-intl/server";

const locales = ["en", "ja"] as const;

export default getRequestConfig(async ({ requestLocale }) => {
  // Next.js 15: requestLocale is a Promise
  const locale = await requestLocale;

  // Validate that the locale is one of the supported locales
  if (!locale || !locales.includes(locale as "en" | "ja")) {
    notFound();
  }
  return {
    locale: locale as string,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
