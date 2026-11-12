export const APP_CONFIG = {
  brandName: "Korshi",
  emergencyPhone: "109",
} as const;

/** Раздел AI виден, только когда на сервере настроен провайдер. */
export const AI_ENABLED = process.env.NEXT_PUBLIC_AI_ENABLED === "true";

/** Название ЖК без «ЖК» и кавычек: интерфейс сам пишет «ЖК «…»». */
export function complexName(value?: string | null) {
  return (value ?? "").trim().replace(/^ЖК\s*/i, "").replace(/^[«"](.*)[»"]$/, "$1").trim();
}
