export type FlashKind = "success" | "error" | "info";

type FlashDetail = { kind: FlashKind; message: string; timeoutMs?: number };

const EVENT_NAME = "app:flash";

export function flash(detail: FlashDetail) {
  window.dispatchEvent(new CustomEvent<FlashDetail>(EVENT_NAME, { detail }));
}

export const flashSuccess = (message: string, timeoutMs = 3000) =>
  flash({ kind: "success", message, timeoutMs });

export const flashError = (message: string, timeoutMs = 4000) =>
  flash({ kind: "error", message, timeoutMs });

export const flashInfo = (message: string, timeoutMs = 3000) =>
  flash({ kind: "info", message, timeoutMs });

export const FLASH_EVENT = EVENT_NAME;
