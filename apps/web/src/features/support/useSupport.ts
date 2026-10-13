import { useEffect, useMemo } from 'react';
import { useStore } from '../../lib/store';
import { splitMessages } from './support';

/** Mensagens do ecrã de apoio; abrir o ecrã marca-as como lidas */
export function useSupport() {
  const { messages, markMessagesRead } = useStore();
  // As mensagens podem chegar do servidor depois de o ecrã abrir: marcar de novo quando chegam
  useEffect(() => {
    markMessagesRead();
  }, [markMessagesRead, messages.length]);
  return useMemo(() => splitMessages(messages), [messages]);
}
