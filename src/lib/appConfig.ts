export const APP_CONFIG = {
  brandName: "Korshi",
  fallbackComplexName: "Солнечный",
  fallbackComplexAddress: "Алматы",
  emergencyPhone: "109",
} as const;

/** Раздел AI виден, только когда на сервере настроен провайдер. */
export const AI_ENABLED = process.env.NEXT_PUBLIC_AI_ENABLED === "true";

export function complexName(value?: string | null) {
  return value?.trim() || APP_CONFIG.fallbackComplexName;
}

export function complexTitle(value?: string | null) {
  return `ЖК «${complexName(value)}»`;
}
