import type { Metadata } from "next";
import "@upds/ui/globals.css";

export const metadata: Metadata = {
  title: "Sistema de Inventario UPDS",
  description: "Control de inventarios - Universidad Privada Domingo Savio",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
