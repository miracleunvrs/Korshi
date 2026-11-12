/** Карта ЖК по координатам из базы: OpenStreetMap внутри и ссылка на 2ГИС. */
export default function ComplexMap({ latitude, longitude, address }: { latitude: number; longitude: number; address?: string }) {
  const delta = 0.004;
  const bbox = [longitude - delta, latitude - delta / 2, longitude + delta, latitude + delta / 2].join(",");
  const embed = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude},${longitude}`;
  const twoGis = `https://2gis.kz/almaty/geo/${longitude},${latitude}`;

  return (
    <section className="overflow-hidden rounded-[28px] border border-stone-200 bg-white">
      <iframe title="Карта ЖК" src={embed} className="h-64 w-full border-0" loading="lazy" referrerPolicy="no-referrer" />
      <div className="flex flex-wrap items-center justify-between gap-2 p-4">
        <p className="text-xs font-semibold text-stone-600">{address}</p>
        <a href={twoGis} target="_blank" rel="noreferrer" className="rounded-xl bg-green-50 px-3 py-2 text-xs font-extrabold text-green-800 hover:bg-green-100">Открыть в 2ГИС</a>
      </div>
    </section>
  );
}
