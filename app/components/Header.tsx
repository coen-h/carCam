'use client';

import { Home, LayoutDashboard, User, LogOut, ChevronDown, Sun, Moon } from "lucide-react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";

export default function Header() {
  const { signOut } = useAuthActions();
  const user = useQuery(api.function.viewer);

  return (
    <div className="navbar min-h-0 flex justify-between z-50">
      <button className="btn btn-soft text-lg">carCam</button>
      <div className="flex items-center gap-2">
        {/* <div className="dropdown"> */}
          <label className="swap swap-rotate btn btn-soft btn-square">
            <input type="checkbox" className="theme-controller" value="light" />
            <Sun className="swap-on" width={24} />
            <Moon className="swap-off" width={24} />
          </label>
          {/* <ul tabIndex="-1" className="dropdown-content bg-base-300 mt-1 rounded-box z-1 w-40 p-2 shadow-2xl">
            <li>
              <input type="radio" name="theme-dropdown" className="theme-controller w-full btn btn-sm btn-block btn-ghost justify-start text-base-content" aria-label="Default" value="default" />
            </li>
            <li>
              <input type="radio" name="theme-dropdown" className="theme-controller w-full btn btn-sm btn-block btn-ghost justify-start text-base-content" aria-label="Dracula" value="dracula" />
            </li>
            <li>
              <input type="radio" name="theme-dropdown" className="theme-controller w-full btn btn-sm btn-block btn-ghost justify-start text-base-content" aria-label="Forest" value="forest" />
            </li>
            <li>
              <input type="radio" name="theme-dropdown" className="theme-controller w-full btn btn-sm btn-block btn-ghost justify-start text-base-content" aria-label="Dim" value="dim" />
            </li>
            <li>
              <input type="radio" name="theme-dropdown" className="theme-controller w-full btn btn-sm btn-block btn-ghost justify-start text-base-content" aria-label="Business" value="business" />
            </li>
            <li>
              <input type="radio" name="theme-dropdown" className="theme-controller w-full btn btn-sm btn-block btn-ghost justify-start text-base-content" aria-label="Pastel" value="pastel" />
            </li>
          </ul> */}
        {/* </div> */}
        {/* <button data-tip="Logout" className='tooltip tooltip-bottom font-normal btn btn-square btn-soft rounded-box' onClick={() => void signOut()}><LogOut /></button> */}
        <div className="menu menu-xs p-1 menu-horizontal bg-base-content/8 text-base-content rounded-box">
          <li>
            <Link href='/' className="tooltip tooltip-bottom text-base-content" data-tip="Home">
              <Home width={24} />
            </Link>
          </li>
          <li>
            <Link href='/dashboard' className="tooltip tooltip-bottom text-base-content" data-tip="Dashboard">
              <LayoutDashboard width={24} />
            </Link>
          </li>
          <li>
            <Link href='/settings' className="tooltip tooltip-bottom" data-tip="User">
              {user ? (
                <img className='size-6 rounded' src={user.image} />
              ) : (
                <User width={24} />
              )}
            </Link>
          </li>
        </div>
      </div>
    </div>
  );
}
