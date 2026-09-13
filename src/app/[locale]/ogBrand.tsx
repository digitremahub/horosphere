// Image de marque partagée par opengraph-image.tsx et twitter-image.tsx —
// factorisée ici pour ne pas dupliquer le rendu (next/og n'autorise qu'un
// export par défaut par fichier de convention, mais rien n'empêche de
// partager la fonction qui construit le JSX).
//
// Sert d'aperçu de lien PAR DÉFAUT pour tout le site (toute page sous
// [locale], y compris /connexion) tant qu'une route ne définit pas son
// propre opengraph-image. Avant ce fichier, aucune image n'était
// configurée : au partage d'un lien (ex. lien de parrainage), l'appli de
// messagerie n'avait rien à afficher — d'où l'aperçu générique/vide
// constaté en partageant un lien.
import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const COULEURS = {
  aube: '#F8E9DD',
  ambre: '#C08A3E',
  encre: '#3D2B24',
  sourdine: '#8A7361',
};

export async function brandOgImage() {
  const logo = await readFile(path.join(process.cwd(), 'src', 'app', 'icon.png'));
  const logoDataUri = `data:image/png;base64,${logo.toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: size.width,
          height: size.height,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: COULEURS.aube,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoDataUri} width={168} height={168} style={{ borderRadius: '50%' }} />
        <div style={{ display: 'flex', fontSize: 56, fontWeight: 700, letterSpacing: 8, color: COULEURS.encre, marginTop: 28, textTransform: 'uppercase' }}>
          Horosphère
        </div>
        <div style={{ display: 'flex', width: 90, height: 1, background: COULEURS.ambre, opacity: 0.7, margin: '20px 0' }} />
        <div style={{ display: 'flex', fontSize: 26, color: COULEURS.sourdine, letterSpacing: 1 }}>
          Le développement personnel par les astres
        </div>
      </div>
    ),
    { width: size.width, height: size.height }
  );
}
