# 🤖 UPDS Inventory System - Orquestador Central (AGENTS.md)

## 📌 Contexto del Proyecto
Sistema de Control de Inventarios para la Unidad de Bienes, Servicios y Compras de la Universidad Privada Domingo Savio (UPDS). 
El sistema gestiona dos ramas principales:
1. **Indumentaria Médica:** Pijamas, batas, mandiles, poleras, gorros (control por talla, tipo, género, stock).
2. **Materiales de Oficina:** Papelería, insumos, control de stock mínimo.

**Módulos Core:** Inventario Médico, Inventario de Oficina, Movimientos (Entradas/Salidas/Ajustes), Usuarios/Roles, y Reportes.

## 🏗️ Arquitectura y Stack Tecnológico
El proyecto es un **Monorepo** (Turborepo/pnpm workspaces recomendado) con la siguiente estructura:
- `/apps/web`: Frontend y Backend API (Next.js App Router).
- `/apps/admin`: Panel administrativo técnico.
- `/packages/db`: Esquema Prisma y cliente PostgreSQL.
- `/packages/ui`: Componentes compartidos (Tailwind CSS + Shadcn UI).
- `/packages/validators`: Esquemas de validación unificados (Zod).
- `/packages/services`: Lógica de negocio pura.

## ⚙️ Flujo de Trabajo Obligatorio: Spec-Driven Development (SDD)
No escribas código sin antes planificar. Ante cualquier requerimiento nuevo (ej. "Crear módulo de salidas"), debes seguir este orden utilizando subagentes:
1. **Explorar:** Revisa el estado actual del código en `/apps` y `/packages`.
2. **Proponer/Diseñar:** Define cómo se conectará la base de datos, qué Server Actions se necesitan y qué componentes de UI se usarán.
3. **Planificar Tareas:** Divide el trabajo en pasos pequeños y secuenciales.
4. **Implementar:** Escribe el código paso a paso.
5. **Verificar:** Asegúrate de que cumple con los requerimientos y el tipado estricto.

## 🧠 Protocolo de Memoria (Engram)
Este proyecto utiliza `engram` para persistir el contexto.
- **Antes de diseñar:** Usa `mem_search` para buscar si ya existen decisiones previas sobre el módulo que vas a tocar (ej. `mem_search("arquitectura movimientos inventario")`).
- **Al tomar una decisión clave:** (Ej. Estructura de la tabla de movimientos, reglas de validación de stock), usa `mem_save` para registrar el `qué`, `por qué` y `dónde`.
- **Al finalizar una sesión:** Usa `mem_session_summary` para guardar en qué estado quedó el trabajo.

## 🔀 Enrutador de Skills (Carga de Contexto bajo Demanda)
Para mantener el contexto limpio, carga **solo** los archivos `.md` de la carpeta `/skills` que coincidan con la tarea actual:

- **Si la tarea involucra Base de Datos, Modelos o Consultas:**
  👉 *Trigger:* "prisma", "postgresql", "esquema", "modelos", "db".
  👉 *Acción:* Lee `skills/prisma-db.md`.

- **Si la tarea involucra UI, Frontend o Componentes Visuales:**
  👉 *Trigger:* "frontend", "componente", "tailwind", "shadcn", "interfaz", "vista".
  👉 *Acción:* Lee `skills/nextjs-ui.md`.

- **Si la tarea involucra Lógica de Negocio, Mutaciones o API:**
  👉 *Trigger:* "server actions", "endpoint", "guardar datos", "movimientos", "zod".
  👉 *Acción:* Lee `skills/server-actions-zod.md`.

- **Si la tarea involucra Autenticación o Permisos:**
  👉 *Trigger:* "login", "roles", "nextauth", "sesión", "admin".
  👉 *Acción:* Lee `skills/auth.md`.

## 📜 Reglas Generales de Código (Globales)
- **Cero `any`:** TypeScript estricto en todo el proyecto. Utiliza los tipos generados por Prisma y los inferidos por Zod.
- **Server Actions Primero:** Evita crear Route Handlers (`/api/...`) a menos que sea estrictamente necesario para integraciones externas. Usa Server Actions para mutaciones.
- **Validación Fuerte:** Todo dato que entre al sistema (formularios o bases de datos) debe pasar por un validador de Zod importado de `/packages/validators`.