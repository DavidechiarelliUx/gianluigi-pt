# Gianluigi PT

Piattaforma fitness online per il personal trainer Gianluigi Chiarelli.
Sito vetrina premium dark/neon + (in fasi successive) app allenamenti, sessioni live, pagamenti.

## Stato

**Fase 1 (design-first)** — sito vetrina premium + design system + motion + form contatto reale.
Login, database, dashboard funzionante e pagamenti arrivano in Fase 2/3.

## Stack (Fase 1)

- Vite + React 18
- Tailwind CSS v3 (design system dark/neon a CSS variables)
- Framer Motion
- React Hook Form + Zod (form)
- Form contatto: Vercel serverless function + Nodemailer

## Sviluppo

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # build di produzione
npm run preview  # anteprima build
```

## Documentazione

Progettazione e roadmap nel vault Obsidian `AstroAi/Wiki/`:
- `gianluigi-pt-roadmap-fasi` — roadmap a 3 fasi
- `gianluigi-pt-piano-fase1` — piano operativo Fase 1
- `gianluigi-pt-wireframe-design-system` — wireframe + design system
- `gianluigi-pt-architettura-tecnica` — architettura (Fase 2/3)
