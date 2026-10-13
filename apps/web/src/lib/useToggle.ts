import { useCallback, useState } from 'react';

/** Estado aberto/fechado com uma função estável para alternar */
export function useToggle(initial = false): [boolean, () => void] {
  const [on, setOn] = useState(initial);
  const toggle = useCallback(() => setOn((v) => !v), []);
  return [on, toggle];
}
