/** Fade the overlay only. A translucent sheet lets the page flash through. */
export const dialogContainerNoFadeSx = {
  opacity: "1 !important",
} as const;

export function dialogPaperVisibility(open: boolean, conceal = false) {
  return conceal || !open ? "hidden" : "visible";
}
