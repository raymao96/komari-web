import { useLayoutEffect, useState } from "react";

export function useHeldTab<T>(tab: T, ready: boolean): T {
  const [held, setHeld] = useState(tab);
  useLayoutEffect(() => {
    if (ready) setHeld(tab);
  }, [ready, tab]);
  return ready ? tab : held;
}
