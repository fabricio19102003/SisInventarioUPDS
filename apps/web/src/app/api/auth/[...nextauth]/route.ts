// ═══════════════════════════════════════════════════════════════════════════════
// NextAuth v5 — API Route Handler
// Expone GET y POST para /api/auth/*
// ═══════════════════════════════════════════════════════════════════════════════

import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
