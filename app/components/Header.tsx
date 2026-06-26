'use client';

import { LayoutDashboard, User, LogOut, CarFront, Sun, Moon, Home } from "lucide-react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header({setIsDarkCom}: {setIsDarkCom: React.Dispatch<React.SetStateAction<boolean | null>>}) {
  const { signOut } = useAuthActions();
  const user = useQuery(api.function.getUser);
  const pathname = usePathname();
  const [activePath, setActivePath] = useState(pathname);
  const [isdark, setIsdark] = useState<boolean>(false);

  useEffect(() => {
    setActivePath(pathname);
  }, [pathname]);

  useEffect(() => {
    const storedTheme = localStorage.getItem('isdark');
    if (storedTheme) {
      setIsdark(JSON.parse(storedTheme));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('isdark', JSON.stringify(isdark));
    setIsDarkCom?.(isdark);
  }, [isdark, setIsDarkCom]);

  useEffect(() => {
    localStorage.setItem('isdark', JSON.stringify(isdark));
    setIsDarkCom?.(isdark);
  }, [isdark]);

  return (
    <div className="navbar min-h-0 flex justify-between z-50 max-md:p-0">
      <Link href='/'><img src='carCam.svg' className={`size-10 max-md:hidden ${isdark? '' : 'invert'} opacity-75 hover:opacity-50 transition`} /></Link>
      <div className="flex items-center gap-2 max-md:hidden">
        {user && (
          <button data-tip="Logout" className='tooltip tooltip-bottom font-normal btn btn-square btn-soft' onClick={() => void signOut()}><LogOut /></button>
        )}
        <label className="swap swap-rotate btn btn-soft btn-square">
          <input type="checkbox" className="theme-controller" value="emerald" checked={isdark} onChange={() => setIsdark(!isdark)} />
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
                <User width={24} />
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
  
          <Link href='/cars' onClick={() => setActivePath('/cars')} className={activePath === '/cars' ? 'dock-active text-primary' : ''}>
            <CarFront width={24} />
          </Link>
        
          <Link href='/users' onClick={() => setActivePath('/users')} className={activePath === '/users' ? 'dock-active text-primary' : ''}>
            <User width={24} />
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
            <Link href='/' onClick={() => setActivePath('/')} className={activePath === '/' ? 'dock-active text-primary' : ''}>
              <Home width={24} />
            </Link>
          </>
        )}

        <label className="swap swap-rotate">
          <input type="checkbox" className="theme-controller" value="emerald" checked={isdark} onChange={() => setIsdark(!isdark)} />
          <Sun className="swap-on" width={24} />
          <Moon className="swap-off" width={24} />
        </label>
        
        {user && (
          <button className='' onClick={() => void signOut()}><LogOut /></button>
        )}
      </div>
    </div>
  );
}
