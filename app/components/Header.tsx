export default function Header() {
  return (
    <header className="bg-neutral-800 text-white p-4">
      <h1 className="text-2xl font-bold">Parking Lot</h1>
      <nav className="mt-2">
        <ul className="flex space-x-4">
          <li><a href="/" className="hover:underline">Home</a></li>
          <li><a href="/search" className="hover:underline">Search</a></li>
          <li><a href="/manage" className="hover:underline">Manage</a></li>
        </ul>
      </nav>
    </header>
  );
}