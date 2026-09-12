import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Portal do Cliente | PD Soluções Digitais",
  description:
    "Portal do Cliente da PD Soluções Digitais para solicitar serviços, orçamentos e consultorias em Contagem - MG.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
