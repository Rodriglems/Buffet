/** Luz ambiente difusa que dá profundidade aos painéis translúcidos. */
export function AmbientLight() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-32 -left-24 size-[420px] rounded-full bg-brand-soft/25 blur-[120px]" />
      <div className="absolute top-40 right-0 size-[380px] rounded-full bg-info/20 blur-[120px]" />
      <div className="absolute bottom-0 left-1/3 size-[420px] rounded-full bg-warning/15 blur-[130px]" />
    </div>
  );
}
