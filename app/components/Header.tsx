export default function Header() {
  return (
    <header className="flex gap-4 bg-neutral-800 text-white px-4">
      <img src='/dogfds.svg' alt="dogfds" className="w-16 h-16" />
      <div className="flex gap-4 items-center">
        <a href="/" className="hover:underline">Home</a>
        <a href="/search" className="hover:underline">Search</a>
      </div>
    </header>
  );
}