'use client';

import { LayoutDashboard, UserSearch, LogOut, Sun, Moon, Home, ScrollText } from "lucide-react";
import Image from "next/image";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "./ThemeContext";

export default function Header() {
  const { signOut } = useAuthActions();
  const user = useQuery(api.function.getUser);
  const pathname = usePathname();
  const [activePath, setActivePath] = useState(pathname);
  const { isdark, toggleTheme } = useTheme();

  return (
    <>
    <nav className="navbar min-h-0 flex justify-between z-50 max-md:p-0">
      <Link aria-label="Home" href='/'><Image src='carCam.svg' width={40} height={40} unoptimized alt="carCam" className={`max-md:hidden ${isdark? '' : 'invert'} opacity-75 hover:opacity-50 transition`} /></Link>
      <div className="flex items-center gap-2 max-md:hidden">
        {user && (
          <button data-tip="Logout" className='tooltip tooltip-bottom font-normal btn btn-square btn-soft' onClick={() => (document.getElementById('header_modal') as HTMLDialogElement).showModal() }><LogOut /></button>
        )}
        <label className="swap swap-rotate btn btn-soft btn-square">
          <input aria-label="Theme Toggle" type="checkbox" className="theme-controller" value="emerald" checked={isdark || false} onChange={toggleTheme} />
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
              <Link href='/search' className="tooltip tooltip-bottom text-base-content" data-tip="Search">
                <UserSearch width={24} />
              </Link>
            </li>
            <li>
              <Link href='/logs' className="tooltip tooltip-bottom text-base-content" data-tip="Logs">
                <ScrollText width={24} />
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
      <div className="dock dock-sm md:hidden text-base-content">
        {user?.role === "teacher" || user?.role === "admin" ? (
        <>
          <Link href='/dashboard' onClick={() => setActivePath('/dashboard')} className={activePath === '/dashboard' ? 'dock-active text-primary' : ''}>
            <LayoutDashboard width={24} />
          </Link>
  
          <Link href='/search' onClick={() => setActivePath('/search')} className={activePath === '/search' ? 'dock-active text-primary' : ''}>
            <UserSearch width={24} />
          </Link>

          <Link href='/logs' onClick={() => setActivePath('/logs')} className={activePath === '/logs' ? 'dock-active text-primary' : ''}>
            <ScrollText width={24} />
          </Link>
        </>
        ) : user?.role === "student" ? (
          <>
            <Link href='/home' onClick={() => setActivePath('/home')} className={activePath === '/home' ? 'dock-active text-primary' : ''}>
              <Home width={24} />
            </Link>
          </>
        ) : (
          <>
            <Link aria-label="Home" href='/' onClick={() => setActivePath('/')} className={activePath === '/' ? 'dock-active text-primary' : ''}>
              <Home width={24} />
            </Link>
          </>
        )}

        <label className="swap swap-rotate">
          <input aria-label="Theme Toggle" type="checkbox" className="theme-controller" value="emerald" checked={isdark || false} onChange={toggleTheme} />
          <Sun className="swap-on" width={24} />
          <Moon className="swap-off" width={24} />
        </label>
        
        {user && (
          <button onClick={() => (document.getElementById('header_modal') as HTMLDialogElement).showModal() }><LogOut /></button>
        )}
      </div>
      
    </nav>
    <dialog id="header_modal" className="modal text-base-content">
      <div className="modal-box max-md:p-4">
        <h3 className="font-bold text-xl text-primary">Log out</h3>
        <p className="text-sm text-base-content/60 mt-1">Are you sure you want to sign out?</p>
        <div className='flex items-center mt-4 gap-2 justify-end'>
          <form method="dialog">
            <button className="btn w-32">Cancel</button>
          </form>
          <button className='btn w-32 btn-primary' onClick={() => void signOut()}>Sign out</button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
    </>
  );
}
