import { IBM_Plex_Mono, Inter } from "next/font/google";
import "./globals.css";
import AdminNav from "./components/AdminNav";
import AdminSidebar from "./components/AdminSidebar";

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
  title: { default: "Little Spots NYC Admin", template: "%s · Little Spots NYC Admin" },
  description: "Superadmin console for the Little Spots NYC database.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${mono.variable} ${sans.variable}`}>
        <AdminNav />
        <div className="shell">
          <AdminSidebar />
          <div className="shell-main">{children}</div>
        </div>
      </body>
    </html>
  );
}
