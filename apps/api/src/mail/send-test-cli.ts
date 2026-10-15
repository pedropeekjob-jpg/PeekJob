import { Resend } from 'resend';
import { loadLocalEnv } from '../common/local-env';

/**
 * Primeiro email de teste pelo SDK do Resend: `npm run email:test -w @peekjob/api [destinatário]`.
 * A chave vem de RESEND_API_KEY (ambiente ou .env.local), nunca do código.
 * Com o remetente onboarding@resend.dev, o Resend só entrega ao email da própria conta.
 */
loadLocalEnv();

const key = process.env.RESEND_API_KEY;
if (!key || key === 're_xxxxxxxxx') {
  console.error('Falta a chave: define RESEND_API_KEY (ex.: no .env.local) com a chave real do Resend (re_…).');
  process.exit(1);
}

const resend = new Resend(key);

(async () => {
  const { data, error } = await resend.emails.send({
    from: process.env.MAIL_FROM ?? 'onboarding@resend.dev',
    to: process.argv[2] ?? 'pedropeekjob@gmail.com',
    subject: 'Hello World',
    html: '<p>Congrats on sending your <strong>first email</strong>!</p>',
  });
  if (error) {
    console.error(`O Resend recusou o envio: ${error.name} — ${error.message}`);
    process.exit(1);
  }
  console.log(`Enviado. Id do Resend: ${data?.id}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
