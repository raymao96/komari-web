import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";

import { TextField } from "@/components/admin/ui";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  applyTrafficResetTimeDigit,
  applyTrafficResetTimeDigits,
  incomingClockDigits,
  moveTrafficResetTimeSegment,
  timeSegmentAtCursor,
  timeSegmentRange,
  type TimeSegment,
  type TypedCount,
} from "@/utils/trafficResetTimeInput";
import { normalizeTrafficResetTime } from "@/utils/trafficResetTimezones";

function useCoarsePointer() {
  const [coarse, setCoarse] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(pointer: coarse)").matches : false,
  );
  useEffect(() => {
    const media = window.matchMedia("(pointer: coarse)");
    const sync = () => setCoarse(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  return coarse;
}

export default function TrafficResetTimeField({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
}) {
  const isMobile = useIsMobile();
  const coarse = useCoarsePointer();
  if (isMobile || coarse) {
    return <TrafficResetTimeParts ariaLabel={ariaLabel} value={value} onChange={onChange} />;
  }
  return <TrafficResetTimeSegments ariaLabel={ariaLabel} value={value} onChange={onChange} />;
}

function TrafficResetTimeParts({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
}) {
  const display = normalizeTrafficResetTime(value);
  const parts = display.split(":") as [string, string, string];
  const hourRef = useRef<HTMLInputElement>(null);
  const minuteRef = useRef<HTMLInputElement>(null);
  const secondRef = useRef<HTMLInputElement>(null);
  const refs = [hourRef, minuteRef, secondRef];
  const valueRef = useRef(display);
  const replaceOnTypeRef = useRef(false);
  const typedCountRef = useRef<TypedCount>(0);
  const focusedSegmentRef = useRef<TimeSegment | null>(null);
  const [drafts, setDrafts] = useState<[string | null, string | null, string | null]>([
    null,
    null,
    null,
  ]);
  valueRef.current = display;

  const shown = (segment: TimeSegment) => drafts[segment] ?? parts[segment];

  const focusSegment = (segment: TimeSegment) => {
    window.requestAnimationFrame(() => {
      refs[segment].current?.focus();
    });
  };

  const commitDigits = (segment: TimeSegment, digits: string) => {
    const typedCount = typedCountRef.current;
    const next = applyTrafficResetTimeDigits(valueRef.current, segment, typedCount, digits);
    typedCountRef.current = next.typedCount;
    valueRef.current = next.value;
    onChange(next.value);
    const nextDrafts: [string | null, string | null, string | null] = [null, null, null];
    if (next.segment === segment && next.typedCount === 1) {
      nextDrafts[segment] = next.value.split(":")[segment]?.slice(-1) ?? digits.slice(-1);
      setDrafts(nextDrafts);
      return;
    }
    setDrafts(nextDrafts);
    if (next.segment !== segment) focusSegment(next.segment);
  };

  const labels = [`${ariaLabel} hours`, `${ariaLabel} minutes`, `${ariaLabel} seconds`];

  return (
    <div className="km-traffic-reset-time-parts">
      {([0, 1, 2] as TimeSegment[]).map((segment) => (
        <Fragment key={segment}>
          {segment > 0 ? (
            <span aria-hidden="true" className="km-traffic-reset-time-sep">
              :
            </span>
          ) : null}
          <div className="km-traffic-reset-time-part">
            <TextField.Root
              ref={refs[segment]}
              aria-label={labels[segment]}
              autoComplete="off"
              className="km-traffic-reset-time-part-input"
              inputMode="numeric"
              maxLength={6}
              pattern="[0-9]*"
              spellCheck={false}
              value={shown(segment)}
              onFocus={() => {
                if (focusedSegmentRef.current === segment) return;
                focusedSegmentRef.current = segment;
                replaceOnTypeRef.current = true;
                typedCountRef.current = 0;
                setDrafts([null, null, null]);
              }}
              onChange={(event) => {
                const replaceOnType = replaceOnTypeRef.current;
                if (replaceOnType) replaceOnTypeRef.current = false;
                if (replaceOnType) typedCountRef.current = 0;
                const digits = incomingClockDigits(
                  event.target.value,
                  parts[segment],
                  replaceOnType,
                  typedCountRef.current,
                );
                if (!digits) {
                  typedCountRef.current = 0;
                  setDrafts((current) => {
                    const next = [...current] as [string | null, string | null, string | null];
                    next[segment] = "";
                    return next;
                  });
                  return;
                }
                commitDigits(segment, digits);
              }}
              onBlur={() => {
                if (focusedSegmentRef.current === segment) focusedSegmentRef.current = null;
                replaceOnTypeRef.current = false;
                typedCountRef.current = 0;
                setDrafts([null, null, null]);
                onChange(normalizeTrafficResetTime(valueRef.current));
              }}
            />
          </div>
        </Fragment>
      ))}
    </div>
  );
}

function TrafficResetTimeSegments({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const typedCountRef = useRef<TypedCount>(0);
  const [segment, setSegment] = useState<TimeSegment>(0);
  const display = normalizeTrafficResetTime(value);
  const displayRef = useRef(display);
  const segmentRef = useRef(segment);
  displayRef.current = display;
  segmentRef.current = segment;

  const selectSegment = (next: TimeSegment) => {
    segmentRef.current = next;
    setSegment(next);
    const { start, end } = timeSegmentRange(next);
    const input = inputRef.current;
    if (!input) return;
    window.requestAnimationFrame(() => {
      input.setSelectionRange(start, end);
    });
  };

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input || document.activeElement !== input) return;
    const { start, end } = timeSegmentRange(segment);
    input.setSelectionRange(start, end);
  }, [display, segment]);

  const commit = (next: string, nextSegment: TimeSegment, typedCount: TypedCount) => {
    typedCountRef.current = typedCount;
    displayRef.current = next;
    segmentRef.current = nextSegment;
    onChange(next);
    selectSegment(nextSegment);
  };

  const applyDigits = (digits: string) => {
    let currentValue = displayRef.current;
    let currentSegment = segmentRef.current;
    let typedCount = typedCountRef.current;
    let applied = false;
    for (const ch of digits) {
      if (ch < "0" || ch > "9") continue;
      const next = applyTrafficResetTimeDigit(currentValue, currentSegment, typedCount, Number(ch));
      currentValue = next.value;
      currentSegment = next.segment;
      typedCount = next.typedCount;
      applied = true;
    }
    if (applied) commit(currentValue, currentSegment, typedCount);
  };
  const applyDigitsRef = useRef(applyDigits);
  applyDigitsRef.current = applyDigits;
  const keydownAppliedRef = useRef(false);
  const pointerSelectingRef = useRef(false);

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    const onPointerDown = () => {
      pointerSelectingRef.current = true;
    };
    const onBeforeInput = (event: Event) => {
      const inputEvent = event as InputEvent;
      const data = inputEvent.data;
      if (!data || !/\d/.test(data)) return;
      event.preventDefault();
      if (keydownAppliedRef.current) return;
      applyDigitsRef.current(data);
    };
    input.addEventListener("pointerdown", onPointerDown);
    input.addEventListener("beforeinput", onBeforeInput);
    return () => {
      input.removeEventListener("pointerdown", onPointerDown);
      input.removeEventListener("beforeinput", onBeforeInput);
    };
  }, []);

  return (
    <TextField.Root
      ref={inputRef}
      aria-label={ariaLabel}
      autoComplete="off"
      placeholder="00:00:00"
      spellCheck={false}
      value={display}
      onChange={(event) => {
        const next = normalizeTrafficResetTime(event.target.value);
        displayRef.current = next;
        typedCountRef.current = 0;
        onChange(next);
      }}
      onFocus={() => {
        typedCountRef.current = 0;
        if (pointerSelectingRef.current) return;
        selectSegment(0);
      }}
      onMouseUp={(event: MouseEvent<HTMLInputElement>) => {
        pointerSelectingRef.current = false;
        typedCountRef.current = 0;
        selectSegment(timeSegmentAtCursor(event.currentTarget.selectionStart ?? 0));
      }}
      onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        if (event.key === "Tab") return;
        if (event.key >= "0" && event.key <= "9") {
          event.preventDefault();
          keydownAppliedRef.current = true;
          applyDigits(event.key);
          queueMicrotask(() => {
            keydownAppliedRef.current = false;
          });
          return;
        }
        if (event.key === "ArrowLeft" || event.key === "Backspace") {
          event.preventDefault();
          typedCountRef.current = 0;
          selectSegment(moveTrafficResetTimeSegment(segmentRef.current, -1));
          return;
        }
        if (event.key === "Delete") {
          event.preventDefault();
          typedCountRef.current = 0;
          const parts = displayRef.current.split(":") as [string, string, string];
          parts[segmentRef.current] = "00";
          const next = parts.join(":");
          displayRef.current = next;
          onChange(next);
          selectSegment(segmentRef.current);
          return;
        }
        if (event.key === "ArrowRight" || event.key === ":" || event.key === ";") {
          event.preventDefault();
          typedCountRef.current = 0;
          selectSegment(moveTrafficResetTimeSegment(segmentRef.current, 1));
          return;
        }
        if (
          event.key === "ArrowUp" ||
          event.key === "ArrowDown" ||
          event.key === " " ||
          event.key === "Home" ||
          event.key === "End"
        ) {
          event.preventDefault();
        }
      }}
      onBlur={() => {
        pointerSelectingRef.current = false;
        typedCountRef.current = 0;
        onChange(normalizeTrafficResetTime(displayRef.current));
      }}
    />
  );
}
