import type { Metadata } from "next";
import "@upds/ui/globals.css";

export const metadata: Metadata = {
  title: "Admin - Sistema de Inventario UPDS",
  description:
    "Panel administrativo tecnico - Universidad Privada Domingo Savio",
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
