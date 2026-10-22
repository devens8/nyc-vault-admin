import { IBM_Plex_Mono, Inter } from "next/font/google";
import "./globals.css";
import AdminNav from "./components/AdminNav";

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata = {
  title: { default: "NYC Vault Admin", template: "%s · NYC Vault Admin" },
  description: "Superadmin console for the NYC Vault database.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${mono.variable} ${sans.variable}`}>
        <AdminNav />
        {children}
      </body>
    </html>
  );
}
