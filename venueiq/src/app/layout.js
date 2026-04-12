import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-primary",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata = {
  title: "VenueIQ — Smart Venue Experience Platform",
  description:
    "AI-powered real-time venue intelligence. Navigate crowds, skip queues, find food & restrooms instantly, and stay safe at large-scale events.",
  keywords: [
    "venue",
    "stadium",
    "crowd management",
    "real-time",
    "queue prediction",
    "event experience",
    "smart venue",
    "AI",
  ],
  authors: [{ name: "VenueIQ Team" }],
  openGraph: {
    title: "VenueIQ — Smart Venue Experience",
    description: "Real-time crowd intelligence for large-scale sporting venues",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${plusJakarta.variable}`} data-scroll-behavior="smooth">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#1a73e8" />
      </head>
      <body>
        <a href="#main-content" className="skip-to-main" id="skip-nav">
          Skip to main content
        </a>
        <AuthProvider>
          <main id="main-content" role="main" aria-label="VenueIQ Application">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
