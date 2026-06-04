import { Menu } from "lucide-react";

export default function Home() {
  return (
    <div>
      <div className="navbar flex justify-between shadow-inner bg-white/10">
        <button className="btn btn-dash text-lg">carCam</button>
        <div className="dropdown dropdown-end">
          <div tabIndex={0} className="avatar btn btn-ghost btn-square">
            <Menu width={32} />
          </div>
          <ul tabIndex={-1} className="dropdown-content menu w-54 bg-base-100 rounded-box">
            <li><a>Item 1</a></li>
            <li><a>Item 2</a></li>
          </ul>
        </div>
      </div>
      <div className="hero min-h-screen" style={{
    backgroundImage:
      "url(https://img.daisyui.com/images/stock/photo-1507358522600-9f71e620c44e.webp)",
  }}>
          <div className="hero-overlay"></div>
        <div className="hero-content">
          <p>test</p>
        </div>

      </div>
    </div>
  );
}
