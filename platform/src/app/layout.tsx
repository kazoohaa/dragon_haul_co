import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "dragon haul co. | Good finds, second lives",
  description: "A considered little shop for pre-loved finds, K-pop, and Magic singles.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en"><body>{children}</body></html>
  );
}
