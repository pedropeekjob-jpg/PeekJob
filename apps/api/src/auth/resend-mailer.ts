import { ConsoleMailer, type MailMessage, type Mailer } from './mailer';

type Env = Record<string, string | undefined>;

/**
 * Envio real de emails pelo Resend (API HTTP, sem SDK).
 * Plano gratuito: 3000 emails/mês. Para enviar a qualquer pessoa é preciso verificar um domínio no Resend.
 */
export class ResendMailer implements Mailer {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
    private readonly fetchFn: typeof fetch = fetch,
    private readonly baseUrl = 'https://api.resend.com',
  ) {}

  async send(msg: MailMessage): Promise<void> {
    const res = await this.fetchFn(`${this.baseUrl}/emails`, {
      method: 'POST',
      headers: { authorization: `Bearer ${this.apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: this.from, to: [msg.to], subject: msg.subject, text: msg.text }),
    });
    // A mensagem de erro não inclui o destinatário (não queremos emails nos logs).
    if (!res.ok) throw new Error(`Resend respondeu ${res.status}`);
  }
}

/** Resend quando há chave; em desenvolvimento, os emails aparecem nos logs; em produção a chave é obrigatória. */
export function createMailer(env: Env = process.env): Mailer {
  if (env.RESEND_API_KEY) {
    if (!env.MAIL_FROM) throw new Error('MAIL_FROM em falta (ex.: "PeekJob <ola@peekjob.pt>")');
    // RESEND_API_URL só para testes de ponta a ponta (servidor de email falso).
    return new ResendMailer(env.RESEND_API_KEY, env.MAIL_FROM, fetch, env.RESEND_API_URL);
  }
  if (env.NODE_ENV === 'production') throw new Error('RESEND_API_KEY em falta: em produção os emails têm de ser enviados');
  return new ConsoleMailer();
}
