import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@upds/ui";
import "@upds/ui/globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sistema de Inventario — UPDS",
  description:
    "Sistema de gestion de inventario de la Universidad Privada Domingo Savio",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
