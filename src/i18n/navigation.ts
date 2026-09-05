import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

// Link/redirect/usePathname/useRouter conscients de la langue courante —
// à utiliser partout à la place des équivalents next/navigation bruts pour
// que la navigation interne (redirections, liens) reste dans la bonne
// langue (ex: /connexion en français, /en/connexion en anglais).
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
