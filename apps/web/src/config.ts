/**
 * Contactos e redes sociais da PeekJob.
 * A CONFIRMAR COM O CLIENTE: email e endereços das páginas. Podem ser definidos no build
 * (VITE_CONTACT_EMAIL, VITE_FACEBOOK_URL, VITE_INSTAGRAM_URL) sem mudar código.
 */
const env = import.meta.env;
export const CONTACT_EMAIL = (env.VITE_CONTACT_EMAIL as string | undefined) || 'pedropeekjob@gmail.com';
export const SOCIAL = {
  facebook: (env.VITE_FACEBOOK_URL as string | undefined) || 'https://www.facebook.com/peekjob',
  instagram: (env.VITE_INSTAGRAM_URL as string | undefined) || 'https://www.instagram.com/peekjob',
};
