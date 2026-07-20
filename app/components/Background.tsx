'use client';

export default function Background() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 parking-grid opacity-45" />
      <div className="absolute -left-44 top-10 size-120 rounded-full bg-primary/8 blur-3xl" />
      <div className="absolute -right-48 top-1/4 size-120 rounded-full bg-secondary/8 blur-3xl" />
      <div className="absolute bottom-[-22rem] left-1/3 size-160 rounded-full bg-primary/6 blur-3xl" />
    </div>
  );
}
