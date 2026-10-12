import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { AppHeader } from "@/components/AppHeader/AppHeader";
import { NotificationContainer } from "@/components/Notification/NotificationContainer";
import { VercelAnalytics } from "@/components/VercelAnalytics/VercelAnalytics";
import { THEME_STORAGE_KEY } from "@/constants/storage";
import { routing, type AppLocale } from "@/i18n/routing";
import { Providers } from "../providers";
import "../globals.scss";

// Body copy stays in Inter; editorial headings use Playfair Display
// (bold/black, roman + italic) via the --font-display variable.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  style: ["normal", "italic"],
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
      className={`${inter.variable} ${playfairDisplay.variable}`}
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
          <NotificationContainer />
          <Providers>
            <a href="#main-content" className="skip-link">
              {skipLabel}
            </a>
            <AppHeader />
            <main id="main-content" tabIndex={-1}>
              {children}
            </main>
          </Providers>
        </NextIntlClientProvider>
        <VercelAnalytics />
      </body>
    </html>
  );
}
