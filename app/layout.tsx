import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MisPromos",
  description: "Promociones bancarias y de billeteras virtuales, según tus bancos y rubros.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
