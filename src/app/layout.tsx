import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Jarvis — Your AI Assistant",
  description: "Chat with the world's best AIs. Study smarter with Google Classroom.",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full overflow-hidden">{children}</body>
    </html>
  );
}
