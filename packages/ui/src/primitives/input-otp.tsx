"use client";
import * as React from "react";
import clsx from "clsx";

export function InputOTP({
  length = 6,
  value,
  onChange,
  className,
}: {
  length?: number;
  value?: string;
  onChange?: (v: string) => void;
  className?: string;
}) {
  const [chars, setChars] = React.useState<string[]>(() =>
    (value ?? "").padEnd(length).slice(0, length).split("")
  );
  const refs = React.useRef<Array<HTMLInputElement | null>>([]);

  React.useEffect(() => {
    if (typeof value === "string")
      setChars(value.padEnd(length).slice(0, length).split(""));
  }, [value, length]);

  function setAt(i: number, c: string) {
    const next = [...chars];
    next[i] = c;
    setChars(next);
    onChange?.(next.join("").slice(0, length));
  }

  function onPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const txt = (e.clipboardData.getData("text") || "")
      .replace(/\s+/g, "")
      .slice(0, length);
    const arr = txt.split("");
    setChars((prev) => {
      const next = Array.from({ length }, (_, i) => arr[i] ?? prev[i] ?? "");
      onChange?.(next.join("").slice(0, length));
      return next;
    });
  }

  return (
    <div className={clsx("flex items-center gap-2", className)}>
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          inputMode="numeric"
          maxLength={1}
          value={chars[i] ?? ""}
          aria-label={`Digit ${i + 1}`}
          className="h-10 w-10 text-center rounded-md border bg-transparent text-base shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(0, 1);
            setAt(i, v);
            if (v && i < length - 1) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace") {
              if (chars[i]) {
                setAt(i, "");
              } else if (i > 0) {
                refs.current[i - 1]?.focus();
                setAt(i - 1, "");
              }
            } else if (e.key === "ArrowLeft" && i > 0)
              refs.current[i - 1]?.focus();
            else if (e.key === "ArrowRight" && i < length - 1)
              refs.current[i + 1]?.focus();
          }}
          onPaste={onPaste}
        />
      ))}
    </div>
  );
}
