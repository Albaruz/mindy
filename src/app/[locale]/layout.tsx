import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { THEME_STORAGE_KEY } from "@/constants/storage";
import { routing, type AppLocale } from "@/i18n/routing";
import "../globals.scss";

// Body copy is available to both public and product routes.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mindy — Match your clothes",
  description:
    "Smart closet PWA with outfit recommendations based on weather, mood, and color analysis.",
  manifest: "/manifest.webmanifest",
  icons: {
    apple: "/icons/icon-192.png",
  },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as AppLocale)) {
    notFound();
  }
  // Static rendering per locale: makes getTranslations/getLocale work
  // in every server component below without forcing dynamic mode.
  setRequestLocale(locale);
  const messages = await getMessages();
  const ta = await getTranslations("Accessibility");
  const skipLabel = ta("skipToContent");

  return (
    <html
      lang={locale}
      className={inter.variable}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
    >
      <body suppressHydrationWarning>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=localStorage.getItem('${THEME_STORAGE_KEY}');if(m==='light'||m==='dark'){document.documentElement.setAttribute('data-theme',m);}}catch(e){}})();`,
          }}
        />
        <NextIntlClientProvider messages={messages}>
          <a href="#main-content" className="skip-link">
            {skipLabel}
          </a>
          <main id="main-content" tabIndex={-1}>
            {children}
          </main>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
