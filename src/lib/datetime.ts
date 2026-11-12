/**
 * Converts a `datetime-local` input value (wall-clock time without a zone) into
 * an ISO instant in the viewer's time zone. Without this the database reads the
 * value as UTC and shifts it by the local offset.
 */
export function localDateTimeToIso(value: string) {
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) throw new Error("Укажите корректные дату и время");
  return new Date(time).toISOString();
}
