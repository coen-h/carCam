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
          <label className="swap swap-rotate btn btn-soft btn-square">
            <input type="checkbox" className="theme-controller" value="light" />
            <Sun className="swap-on" width={24} />
            <Moon className="swap-off" width={24} />
          </label>
          
        {/* <button data-tip="Logout" className='tooltip tooltip-bottom font-normal btn btn-square btn-soft rounded-box' onClick={() => void signOut()}><LogOut /></button> */}
        <div className="menu menu-xs p-1 menu-horizontal btn btn-soft rounded-box">
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
            <Link href='/users' className="tooltip tooltip-bottom" data-tip="User">
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
