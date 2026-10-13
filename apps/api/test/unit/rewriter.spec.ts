import { findPersonalAttacks } from '@peekjob/shared';
import { AnthropicRewriter, createRewriter, RulesRewriter } from '../../src/rewrite/rewriter';

type Call = { url: string; init: RequestInit };
const fakeFetch = (calls: Call[], reply: (body: any) => Response) =>
  (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return reply(JSON.parse(init.body as string));
  }) as unknown as typeof fetch;
const aiSays = (text: string) => () => new Response(JSON.stringify({ content: [{ type: 'text', text }] }), { status: 200 });

describe('Reescrita do comentário', () => {
  const angry = 'O Ricardo é um incompetente, grita com toda a gente e o salário chega sempre atrasado.';

  it('IA: chama a API da Anthropic com chave, versão, modelo e o texto delimitado como dados', async () => {
    const calls: Call[] = [];
    const ai = new AnthropicRewriter('sk-test', 'claude-haiku-5-5', fakeFetch(calls, aiSays('A chefia grita com a equipa e o salário chega sempre atrasado.')));
    const r = await ai.rewrite(angry, 'pt');
    expect(r).toEqual({ text: 'A chefia grita com a equipa e o salário chega sempre atrasado.', source: 'ai' });
    expect(calls[0].url).toBe('https://api.anthropic.com/v1/messages');
    const h = calls[0].init.headers as Record<string, string>;
    expect(h['x-api-key']).toBe('sk-test');
    expect(h['anthropic-version']).toBe('2023-06-01');
    const body = JSON.parse(calls[0].init.body as string);
    expect(body.model).toBe('claude-haiku-5-5');
    expect(body.system).toMatch(/factos/i); // mantém os factos (salários em atraso, assédio...)
    expect(body.messages[0].content).toContain(`<texto>\n${angry}\n</texto>`);
  });

  it('IA: pede a resposta no idioma do texto', async () => {
    const calls: Call[] = [];
    await new AnthropicRewriter('k', 'm', fakeFetch(calls, aiSays('The manager shouts at the team.'))).rewrite('Ricardo is an idiot who shouts.', 'en');
    expect(JSON.parse(calls[0].init.body as string).system).toMatch(/English/);
  });

  it('IA: rede de segurança — se a resposta ainda tiver nomes ou insultos, passa pelas regras', async () => {
    const r = await new AnthropicRewriter('k', 'm', fakeFetch([], aiSays('O Ricardo é idiota.'))).rewrite(angry, 'pt');
    expect(findPersonalAttacks(r.text).blocked).toBe(false);
    expect(r.source).toBe('ai');
  });

  it('IA em baixo ou resposta vazia: cai para as regras, sem erro', async () => {
    const down = new AnthropicRewriter('k', 'm', fakeFetch([], () => new Response('{}', { status: 529 })));
    const r1 = await down.rewrite(angry, 'pt');
    expect(r1.source).toBe('rules');
    expect(findPersonalAttacks(r1.text).blocked).toBe(false);
    const empty = await new AnthropicRewriter('k', 'm', fakeFetch([], aiSays('  '))).rewrite(angry, 'pt');
    expect(empty.source).toBe('rules');
  });

  it('IA: resposta demasiado longa é cortada ao limite das avaliações', async () => {
    const r = await new AnthropicRewriter('k', 'm', fakeFetch([], aiSays('a'.repeat(5000)))).rewrite(angry, 'pt');
    expect(r.text.length).toBeLessThanOrEqual(600);
  });

  it('regras: retira nomes e insultos, no idioma certo', async () => {
    const pt = await new RulesRewriter().rewrite(angry, 'pt');
    expect(pt.source).toBe('rules');
    expect(pt.text).not.toMatch(/Ricardo|incompetente/);
    const en = await new RulesRewriter().rewrite('Ricardo is an idiot.', 'en');
    expect(en.text).toMatch(/^The manager/);
  });

  it('escolhe a IA quando há chave e as regras quando não há (nunca impede o arranque)', () => {
    expect(createRewriter({ ANTHROPIC_API_KEY: 'sk' })).toBeInstanceOf(AnthropicRewriter);
    expect(createRewriter({})).toBeInstanceOf(RulesRewriter);
    expect(createRewriter({ NODE_ENV: 'production' })).toBeInstanceOf(RulesRewriter);
  });
});
