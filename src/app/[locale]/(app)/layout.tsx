import type { ReactNode } from "react";
import { Playfair_Display } from "next/font/google";
import { AppHeader } from "@/components/AppHeader/AppHeader";
import { NotificationContainer } from "@/components/Notification/NotificationContainer";
import { VercelAnalytics } from "@/components/VercelAnalytics/VercelAnalytics";
import { Providers } from "../../providers";
import { UploadQueueManager } from "@/features/closet/components/upload/upload-queue-manager/UploadQueueManager";

// Editorial typography is needed only by authenticated product routes.
const playfairDisplay = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  style: ["normal", "italic"],
});

// Product-only client infrastructure stays out of public authentication pages.
// Route groups do not alter URLs, so product routes retain their existing paths.
export default function ProductLayout({ children }: { children: ReactNode }) {
  return (
    <div className={playfairDisplay.variable}>
      <Providers>
        <UploadQueueManager />
        <NotificationContainer />
        <AppHeader />
        {children}
        <VercelAnalytics />
      </Providers>
    </div>
  );
}
