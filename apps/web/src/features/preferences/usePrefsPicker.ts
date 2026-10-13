import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CriterionKey } from '../../data/criteria';
import { useStore } from '../../lib/store';
import { togglePick } from './prefs';

/** Escolha das 3 prioridades: só se guarda ao confirmar */
export function usePrefsPicker() {
  const { prefs, setPrefs, finishOnboarding } = useStore();
  const navigate = useNavigate();
  const [picks, setPicks] = useState<CriterionKey[]>(prefs);

  const pick = useCallback((k: CriterionKey) => setPicks((p) => togglePick(p, k)), []);
  const confirm = useCallback(() => {
    setPrefs(picks);
    navigate('/a-preparar');
  }, [setPrefs, picks, navigate]);
  const skip = useCallback(() => {
    finishOnboarding();
    navigate('/explorar');
  }, [finishOnboarding, navigate]);

  return { picks, pick, confirm, skip };
}

export type PrefsPicker = ReturnType<typeof usePrefsPicker>;
