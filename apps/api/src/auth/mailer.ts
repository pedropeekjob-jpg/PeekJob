import { Injectable, Logger } from '@nestjs/common';

export const MAILER = Symbol('MAILER');

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  link?: string;
}

export interface Mailer {
  send(msg: MailMessage): Promise<void>;
}

/** Desenvolvimento: mostra o email (e o link) nos logs. Em produção usa-se o ResendMailer. */
@Injectable()
export class ConsoleMailer implements Mailer {
  private readonly log = new Logger('Email');
  async send(msg: MailMessage) {
    // Em desenvolvimento mostra o conteúdo (link ou código) para se poder testar sem servidor de email.
    const body = process.env.NODE_ENV === 'production' ? '' : ` | ${msg.text.replace(/\s+/g, ' ')}`;
    this.log.log(`Para ${msg.to}: ${msg.subject}${msg.link ? ` → ${msg.link}` : ''}${body}`);
  }
}

/** Testes: guarda os emails em memória. */
export class InMemoryMailer implements Mailer {
  outbox: MailMessage[] = [];
  /** Simula uma falha do serviço de email no próximo envio */
  failNext = false;
  async send(msg: MailMessage) {
    if (this.failNext) {
      this.failNext = false;
      throw new Error('falha simulada');
    }
    this.outbox.push(msg);
  }
  clear() {
    this.outbox = [];
    this.failNext = false;
  }
  lastTokenFor(to: string): string {
    const m = [...this.outbox].reverse().find((x) => x.to === to.trim().toLowerCase());
    const token = m?.link?.match(/token=([A-Za-z0-9_-]+)/)?.[1];
    if (!token) throw new Error(`Sem link para ${to}`);
    return token;
  }
  lastCodeFor(to: string): string {
    const m = [...this.outbox].reverse().find((x) => x.to === to.trim().toLowerCase());
    const code = m?.text.match(/\b(\d{6})\b/)?.[1];
    if (!code) throw new Error(`Sem código para ${to}`);
    return code;
  }
}
