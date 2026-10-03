"use client";

import { useLayoutEffect, useRef, type TextareaHTMLAttributes } from "react";

// Grows with its content so a long AI suggestion is readable without scrolling inside the field.
export function AutoGrowTextarea({ value, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight + element.offsetHeight - element.clientHeight}px`;
  }, [value]);

  return <textarea ref={ref} value={value} {...props} className={`resize-none overflow-hidden ${props.className ?? ""}`} />;
}
