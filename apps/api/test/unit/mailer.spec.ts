import { ConsoleMailer } from '../../src/auth/mailer';
import { createMailer, ResendMailer } from '../../src/auth/resend-mailer';

describe('Envio de emails', () => {
  const msg = { to: 'pessoa@gmail.com', subject: 'Olá', text: 'Abre este link:\nhttps://x/#/entrar?token=abc' };

  it('Resend: envia pela API HTTP com a chave e o remetente', async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const fetchFn = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ id: 'e1' }), { status: 200 });
    }) as unknown as typeof fetch;
    await new ResendMailer('re_123', 'PeekJob <ola@peekjob.pt>', fetchFn).send(msg);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://api.resend.com/emails');
    expect(calls[0].init.method).toBe('POST');
    expect((calls[0].init.headers as Record<string, string>).authorization).toBe('Bearer re_123');
    const body = JSON.parse(calls[0].init.body as string);
    expect(body).toMatchObject({ from: 'PeekJob <ola@peekjob.pt>', to: ['pessoa@gmail.com'], subject: 'Olá', text: msg.text });
  });

  it('Resend: um erro do serviço lança exceção sem expor o destinatário', async () => {
    const fetchFn = (async () => new Response('{"message":"invalid"}', { status: 422 })) as unknown as typeof fetch;
    const err = await new ResendMailer('re_123', 'a@b.pt', fetchFn).send(msg).catch((e) => e as Error);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toContain('422');
    expect(err.message).not.toContain('pessoa@gmail.com');
  });

  it('escolhe o Resend quando há chave', () => {
    expect(createMailer({ RESEND_API_KEY: 're_1', MAIL_FROM: 'a@b.pt' })).toBeInstanceOf(ResendMailer);
  });

  it('em desenvolvimento, sem chave, mostra os emails nos logs', () => {
    expect(createMailer({})).toBeInstanceOf(ConsoleMailer);
  });

  it('em produção recusa arrancar sem chave ou sem remetente', () => {
    expect(() => createMailer({ NODE_ENV: 'production' })).toThrow(/RESEND_API_KEY/);
    expect(() => createMailer({ NODE_ENV: 'production', RESEND_API_KEY: 're_1' })).toThrow(/MAIL_FROM/);
  });
});
