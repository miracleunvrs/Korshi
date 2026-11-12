import { useAppStore } from "@/stores/appStore";

/** Ошибка фонового запроса уходит в общую плашку, а не теряется. */
export function reportBackendError(context: string) {
  return (error: unknown) => {
    const reason = error instanceof Error ? error.message : "нет связи с сервером";
    useAppStore.setState({ backendError: `${context}: ${reason}` });
  };
}
