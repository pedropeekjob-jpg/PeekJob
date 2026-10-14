import { byPt } from '../lib/format';
import type { CriterionKey } from './criteria';

export type OrgType = 'PME' | 'Associação' | 'Voluntariado' | 'Nome individual';
export const ORG_TYPES: OrgType[] = ['PME', 'Associação', 'Voluntariado', 'Nome individual'];
export type SizeBand = '1–9' | '10–49' | '50–249';

export type Scores = Record<CriterionKey, number | null>;

export interface OrgLocation {
  id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
  /** posição do pino no mapa ilustrado (0–100) */
  mapX: number;
  mapY: number;
}

export interface Review {
  id: string;
  role: string;
  locationId?: string;
  when: string;
  score: number;
  title: string;
  body: string;
  useful: number;
  verified: boolean;
  tags?: string[];
  /** resposta pública da organização (modo API) */
  reply?: string;
}

export interface Interview {
  id: string;
  role: string;
  when: string;
  positive: boolean;
  offer: boolean;
  steps: string;
  body: string;
}

export interface SalaryBand {
  role: string;
  min: number;
  max: number;
  median: number;
  count: number;
}

export interface Org {
  id: string;
  name: string;
  type: OrgType;
  sector: string;
  city: string;
  district: string;
  people: number;
  size: SizeBand;
  score: number;
  reviewsCount: number;
  verifiedPct: number;
  /** variação de posição no ranking esta semana */
  trend: number | 'novo';
  /** variação da nota esta semana */
  weekDelta: number;
  scores: Scores;
  summary: string;
  respeitoTags: { label: string; n: number }[];
  harassmentReports: number;
  locations: OrgLocation[];
  reviews: Review[];
  interviews: Interview[];
  interviewStats?: { positivePct: number; offerPct: number; answeredPct: number; difficulty?: number; usualSteps: string };
  salaries: SalaryBand[];
  paidOnTimePct?: number;
  claimed: boolean;
}

const s = (
  salario: number | null,
  equilibrio: number,
  respeito: number,
  ambiente: number,
  lideranca: number,
  estabilidade: number | null,
  progressao: number,
  proposito: number,
): Scores => ({ salario, equilibrio, respeito, ambiente, lideranca, estabilidade, progressao, proposito });

const loc = (id: string, label: string, address: string, lat: number, lng: number, mapX = 57, mapY = 51): OrgLocation => ({
  id, label, address, lat, lng, mapX, mapY,
});

/** Avaliações genéricas para organizações sem dados detalhados no protótipo */
function genericReviews(org: { id: string; score: number }): Review[] {
  const sc = org.score;
  return [
    { id: org.id + '-r1', role: 'Equipa', when: 'há 1 semana', score: Math.min(5, sc + 0.2), title: 'Boa equipa, regras claras.', body: 'Sabemos com o que contamos. Há sempre alguém disponível para ajudar.', useful: 4, verified: true },
    { id: org.id + '-r2', role: 'Equipa', when: 'há 1 mês', score: Math.max(1, sc - 0.3), title: 'Bom sítio, com coisas a melhorar.', body: 'Os horários mudam em cima da hora em algumas semanas.', useful: 2, verified: true },
    { id: org.id + '-r3', role: 'Estágio', when: 'há 3 meses', score: sc, title: 'Aprendi bastante.', body: 'Acompanhamento próximo nas primeiras semanas.', useful: 1, verified: false },
  ];
}

const RIBEIRA: Org = {
  id: 'padaria-ribeira',
  name: 'Padaria Ribeira',
  type: 'PME',
  sector: 'Restauração',
  city: 'Porto',
  district: 'Porto',
  people: 12,
  size: '10–49',
  score: 4.4,
  reviewsCount: 23,
  verifiedPct: 83,
  trend: 1,
  weekDelta: 0.1,
  scores: s(3.8, 4.1, 4.8, 4.7, 4.5, 4.3, 3.6, 4.2),
  summary: 'Equipa unida e chefia que ouve. O salário é justo, mas há pouco espaço para progredir.',
  respeitoTags: [
    { label: 'Igualdade salarial', n: 9 },
    { label: 'Horários para quem cuida', n: 6 },
    { label: 'Seguro para pessoas LGBTI+', n: 4 },
  ],
  harassmentReports: 0,
  locations: [
    loc('flores', 'Loja · Rua das Flores', 'Rua das Flores, 112, Porto', 41.1437, -8.6129, 57, 51),
    loc('campanha', 'Fabrico · Campanhã', 'Rua do Freixo, 40, Porto', 41.1462, -8.5813, 82, 30),
  ],
  reviews: [
    { id: 'r1', role: 'Balcão', locationId: 'flores', when: 'há 4 dias', score: 4.5, title: 'Equipa que se ajuda e chefia que ouve.', body: 'Horários combinados com antecedência. Salário justo, mas sem prémios.', useful: 7, verified: true, tags: ['Horários cumpridos', 'Ambiente seguro'] },
    { id: 'r2', role: 'Fabrico', locationId: 'campanha', when: 'há 1 mês', score: 4.0, title: 'Bom para começar, pouco espaço para crescer.', body: 'Aprendi muito. Para progredir é preciso esperar que alguém saia.', useful: 3, verified: true },
    { id: 'r3', role: 'Balcão', locationId: 'flores', when: 'há 2 meses', score: 4.6, title: 'Respeitam quem tem filhos.', body: 'Ajustaram-me o horário quando precisei. Nunca houve problema.', useful: 5, verified: true, tags: ['Horários para quem cuida'] },
    { id: 'r4', role: 'Pastelaria', locationId: 'campanha', when: 'há 3 meses', score: 3.9, title: 'Muito trabalho ao fim de semana.', body: 'Boa equipa, mas os sábados são pesados e pouco compensados.', useful: 2, verified: false },
    { id: 'r5', role: 'Entregas', locationId: 'campanha', when: 'há 5 meses', score: 4.2, title: 'Pagam sempre a horas.', body: 'Em dois anos nunca houve atraso. Contrato desde o primeiro mês.', useful: 6, verified: true },
  ],
  interviews: [
    { id: 'i1', role: 'Balcão', when: 'há 2 semanas', positive: true, offer: true, steps: 'Conversa + dia de experiência', body: 'Conversa curta com a dona e um dia de experiência pago. Resposta em 3 dias.' },
    { id: 'i2', role: 'Pastelaria', when: 'há 2 meses', positive: true, offer: false, steps: 'Conversa', body: 'Explicaram bem o horário. Não fiquei, mas responderam a dizer porquê.' },
    { id: 'i3', role: 'Fabrico', when: 'há 4 meses', positive: false, offer: false, steps: 'Conversa', body: 'Fui ao fabrico em Campanhã. Demoraram três semanas a responder.' },
  ],
  interviewStats: { positivePct: 75, offerPct: 50, answeredPct: 88, difficulty: 2.4, usualSteps: 'Conversa curta e um dia de experiência pago' },
  salaries: [
    { role: 'Balcão', min: 870, max: 1050, median: 950, count: 9 },
    { role: 'Pastelaria', min: 950, max: 1250, median: 1100, count: 5 },
    { role: 'Fabrico', min: 900, max: 1150, median: 1000, count: 4 },
    { role: 'Gestão de loja', min: 1200, max: 1500, median: 1350, count: 3 },
  ],
  paidOnTimePct: 92,
  claimed: true,
};

type Seed = [
  id: string, name: string, type: OrgType, sector: string, city: string, district: string, people: number,
  score: number, reviews: number, trend: number | 'novo', weekDelta: number, scores: Scores, summary: string,
  lat: number, lng: number, street: string,
];

const SEEDS: Seed[] = [
  ['maos-dadas', 'Associação Mãos Dadas', 'Associação', 'Ação social', 'Braga', 'Braga', 22, 4.6, 18, 0, 0.1, s(3.4, 4.2, 4.9, 4.8, 4.6, 3.9, 4.0, 4.9), 'Propósito forte e equipa que cuida de quem cuida. Salários modestos.', 41.5503, -8.42, 'Rua do Souto, 15, Braga'],
  ['rede-vizinha', 'Rede Vizinha', 'Voluntariado', 'Comunidade', 'Porto', 'Porto', 40, 4.7, 14, 2, 0.3, s(null, 4.5, 4.9, 4.8, 4.4, null, 4.1, 4.9), 'Voluntariado bem organizado, com formação e horários flexíveis.', 41.157, -8.6291, 'Rua de Cedofeita, 200, Porto'],
  ['oficina-sete', 'Oficina Sete', 'PME', 'Design', 'Porto', 'Porto', 9, 4.2, 9, 0, 0, s(4.0, 3.9, 4.5, 4.4, 4.1, 3.8, 4.3, 3.9), 'Estúdio pequeno, projetos variados e muita autonomia.', 41.1496, -8.6109, 'Rua de Miguel Bombarda, 451, Porto'],
  ['estudio-lume', 'Estúdio Lume', 'Nome individual', 'Arquitetura', 'Coimbra', 'Coimbra', 3, 3.9, 6, 'novo', 0, s(3.6, 3.4, 4.2, 4.3, 3.9, 3.2, 4.4, 3.8), 'Aprende-se muito, mas os prazos apertam.', 40.2033, -8.4103, 'Rua da Sofia, 30, Coimbra'],
  ['clinica-foz', 'Clínica Foz', 'PME', 'Saúde', 'Porto', 'Porto', 40, 4.0, 41, 2, 0, s(3.9, 3.6, 4.2, 4.1, 3.8, 4.4, 3.9, 4.3), 'Estável e bem organizada. Turnos longos em época alta.', 41.1556, -8.6748, 'Avenida do Brasil, 80, Porto'],
  ['ponte-norte', 'Associação Ponte Norte', 'Associação', 'Cultura', 'Porto', 'Porto', 14, 4.3, 12, -1, 0, s(3.1, 4.4, 4.7, 4.6, 4.2, 3.5, 4.0, 4.8), 'Projetos com impacto e ambiente muito inclusivo.', 41.1466, -8.6061, 'Rua de Santa Catarina, 500, Porto'],
  ['banco-tempo', 'Banco de Tempo Bonfim', 'Voluntariado', 'Comunidade', 'Porto', 'Porto', 28, 4.5, 15, 0, 0.1, s(null, 4.6, 4.8, 4.7, 4.3, null, 3.9, 4.9), 'Trocas de tempo entre vizinhos, com coordenação próxima.', 41.1474, -8.5958, 'Rua do Bonfim, 120, Porto'],
  ['ana-reis', 'Ana Reis Fotografia', 'Nome individual', 'Fotografia', 'Porto', 'Porto', 3, 4.1, 5, 'novo', 0, s(3.7, 3.9, 4.6, 4.2, 4.0, 3.3, 4.2, 3.6), 'Trabalho criativo e pagamentos a tempo. Pouca estabilidade.', 41.1412, -8.6158, 'Rua de Mouzinho da Silveira, 20, Porto'],
  ['cafe-vinha', 'Café Vinha', 'PME', 'Restauração', 'Vila Nova de Gaia', 'Porto', 11, 3.8, 17, 3, 0.2, s(3.5, 3.4, 4.0, 4.1, 3.7, 3.6, 3.4, 3.5), 'Bom ambiente entre colegas. Horários pouco previsíveis.', 41.1333, -8.6167, 'Avenida da República, 300, Vila Nova de Gaia'],
  ['norte-logistica', 'Norte Logística', 'PME', 'Logística', 'Maia', 'Porto', 45, 3.1, 52, -2, -0.1, s(2.6, 2.4, 2.9, 3.4, 2.8, 3.6, 3.0, 3.1), 'Contratos estáveis, mas turnos pesados e chefias pouco disponíveis.', 41.2357, -8.6199, 'Zona Industrial da Maia, Lote 12'],
  ['lavandaria-sol', 'Lavandaria Sol', 'PME', 'Limpeza', 'Matosinhos', 'Porto', 8, 2.9, 11, -4, -0.4, s(2.4, 2.6, 2.7, 3.2, 2.8, 3.1, 2.7, 2.9), 'Relatos de horas extra não pagas e pouca comunicação.', 41.1844, -8.6963, 'Rua Brito Capelo, 90, Matosinhos'],
];

const size = (n: number): SizeBand => (n < 10 ? '1–9' : n < 50 ? '10–49' : '50–249');

export const ORGS: Org[] = [
  RIBEIRA,
  ...SEEDS.map(([id, name, type, sector, city, district, people, score, reviewsCount, trend, weekDelta, scores, summary, lat, lng, street]) => {
    const base = { id, score };
    const org: Org = {
      id, name, type, sector, city, district, people, size: size(people), score, reviewsCount,
      verifiedPct: 70 + ((reviewsCount * 7) % 25), trend, weekDelta, scores, summary,
      respeitoTags: (scores.respeito ?? 0) >= 4
        ? [{ label: 'Trata todos por igual', n: 5 }, { label: 'Linguagem inclusiva', n: 3 }]
        : [{ label: 'Pouca abertura a queixas', n: 3 }],
      harassmentReports: (scores.respeito ?? 5) < 3 ? 2 : 0,
      locations: [loc('sede', 'Sede', street, lat, lng)],
      reviews: genericReviews(base),
      interviews: [
        { id: id + '-i1', role: 'Equipa', when: 'há 1 mês', positive: score >= 3.5, offer: score >= 4, steps: 'Conversa', body: score >= 3.5 ? 'Conversa simpática e resposta rápida.' : 'Nunca chegou resposta.' },
      ],
      salaries: scores.salario === null ? [] : [
        { role: 'Equipa', min: 850, max: 1100, median: 950, count: 4 },
      ],
      paidOnTimePct: scores.salario === null ? undefined : Math.round(50 + (scores.salario ?? 3) * 9),
      claimed: score >= 4.2,
    };
    return org;
  }),
];

export const ORG_BY_ID: Record<string, Org> = Object.fromEntries(ORGS.map((o) => [o.id, o]));

export const SECTORS = Array.from(new Set(ORGS.map((o) => o.sector))).sort(byPt);
