export default function Header() {
  return (
    <header className="flex gap-4 bg-neutral-800 text-white p-4">
      <h1 className="text-2xl font-bold">Parking Lot</h1>
      <div className="flex gap-4 items-center">
        <a href="/" className="hover:underline">Home</a>
        <a href="/search" className="hover:underline">Search</a>
      </div>
    </header>
  );
}