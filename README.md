# Horosphère

Horoscope du jour — application Next.js (App Router).

## Développement

```bash
npm install
npm run dev
```

## Structure

- `app/page.js` — page principale (choix du signe, carte du jour, thème).
- `app/layout.js` — layout, polices, métadonnées.
- `app/globals.css` — styles.
- `app/components/Starfield.js` — fond animé étoilé (mode sombre).
- `lib/data.js` — signes, textes, génération déterministe du contenu du jour.
- `public/images/` — dossier prévu pour les images du site (logo, icônes de signes, etc.).

## Déploiement

Déployé sur Vercel (projet `horosphere-live`).
