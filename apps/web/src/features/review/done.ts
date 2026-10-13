import type { Org } from '../../data/orgs';
import { tr } from '../../i18n';
import { plural } from '../../lib/format';
import type { MyReview, SupportMessage } from '../../lib/store';

/** Regras e textos do ecrã "publicado" (funções puras: testadas sem React) */

/** A avaliação acabada de publicar */
export const publishedReview = (myReviews: MyReview[], lastPublished: string | null) => (lastPublished ? myReviews.find((r) => r.id === lastPublished) : undefined);

/** Total de avaliações da organização: o servidor já a conta (modo API); na demonstração soma-se aqui */
export const totalAfterPublishing = (org: Org | undefined, api: boolean) => (api ? org?.reviewsCount ?? 1 : (org?.reviewsCount ?? 0) + 1);

/** Mensagens por ler (pelo menos 1: a que o relato acabou de gerar pode ainda não ter chegado) */
export const unreadAfterPublishing = (messages: SupportMessage[]) => messages.filter((m) => !m.read).length || 1;

export const reviewsCountText = (n: number) => plural(n, tr('avaliação', 'review'), tr('avaliações', 'reviews'));

export const privateMessagesText = (n: number) => plural(n, tr('mensagem privada', 'private message'), tr('mensagens privadas', 'private messages'));
