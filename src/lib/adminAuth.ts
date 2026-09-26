// Accès au backoffice (/app/admin) — liste blanche d'e-mails, configurable
// via la variable d'environnement ADMIN_EMAILS (séparés par des virgules)
// sans avoir besoin de redéployer. Par défaut (variable absente), les deux
// adresses déjà connues de l'équipe Horosphère, pour que la page
// fonctionne dès l'installation plutôt que de rester inaccessible tant que
// personne n'a pensé à configurer la variable.

const PAR_DEFAUT = ['digitrema@gmail.com', 'horosphere.france@gmail.com'];

export function getAdminEmails(): string[] {
  const configures = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return configures.length > 0 ? configures : PAR_DEFAUT;
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.toLowerCase());
}
