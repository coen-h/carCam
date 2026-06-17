'use client';

import { LayoutDashboard, User, LogOut, CarFront, Sun, Moon, Home } from "lucide-react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";

export default function Header() {
  const { signOut } = useAuthActions();
  const user = useQuery(api.function.getUser);

  return (
    <div className="navbar min-h-0 flex justify-between z-50">
      <button className="btn btn-soft text-lg">carCam</button>
      <div className="flex items-center gap-2">
        {user && (
          <button data-tip="Logout" className='tooltip tooltip-bottom font-normal btn btn-square btn-soft' onClick={() => void signOut()}><LogOut /></button>
        )}
        <label className="swap swap-rotate btn btn-soft btn-square">
          <input type="checkbox" className="theme-controller" value="nord" />
          <Sun className="swap-on" width={24} />
          <Moon className="swap-off" width={24} />
        </label>
        {user?.role === "teacher" || user?.role === "admin" ? (
          <div className="menu menu-xs p-1 menu-horizontal btn btn-soft font-normal">
            <li>
              <Link href='/dashboard' className="tooltip tooltip-bottom text-base-content" data-tip="Dashboard">
                <LayoutDashboard width={24} />
              </Link>
            </li>
            <li>
              <Link href='/cars' className="tooltip tooltip-bottom text-base-content" data-tip="Cars">
                <CarFront width={24} />
              </Link>
            </li>
            <li>
              <Link href='/users' className="tooltip tooltip-bottom" data-tip="User">
                {user ? (
                // <img className='size-6 rounded' src={user.image} />
                  <User className="rounded size-6" />
                ) : (
                  <User width={24} />
                )}
              </Link>
            </li>
          </div>
        ) : user?.role === "student" &&  (
          <li>
            <Link href='/home' className="btn btn-soft btn-square tooltip tooltip-bottom text-base-content" data-tip="Home">
              <Home width={24} />
            </Link>
          </li>
        )}
      </div>
    </div>
  );
}
