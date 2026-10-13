import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrgs } from '../../api/orgs';
import { useStore } from '../../lib/store';
import { lastMessageWhen, orgNameOf, settingsLinks, unreadCount, verificationValue } from './profile';

/** Dados e ações da página da conta */
export function useProfile(desktop: boolean) {
  const nav = useNavigate();
  const { user, prefs, messages, myReviews, draft, logout, resetDemo } = useStore();
  const orgs = useOrgs();
  const [resetDone, setResetDone] = useState(false);

  const orgName = useCallback((id: string) => orgNameOf(orgs, id), [orgs]);
  const verification = verificationValue(draft, orgs);
  const moderator = user?.role === 'moderator';
  const settings = useMemo(() => settingsLinks({ verification, desktop, moderator }), [verification, desktop, moderator]);

  const signOut = useCallback(() => {
    void logout();
    nav('/entrar');
  }, [logout, nav]);
  const reset = useCallback(() => {
    resetDemo();
    setResetDone(true);
  }, [resetDemo]);

  return {
    user,
    prefs,
    myReviews,
    unread: unreadCount(messages),
    lastWhen: lastMessageWhen(messages),
    verification,
    settings,
    orgName,
    signOut,
    reset,
    resetDone,
  };
}

export type Profile = ReturnType<typeof useProfile>;
