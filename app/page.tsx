'use client';

import Header from "@/app/components/Header";
import Link from 'next/link'
import { useState } from "react";

export default function Home() {
  const [isdark, setIsdarkCom] = useState<boolean | null>(null);

  return (
    <div className={`w-screen h-screen ${!isdark ? 'codioful-dark' : 'codioful-light'} overflow-hidden`}>
      <Header setIsDarkCom={setIsdarkCom} />
      <div className="w-screen h-screen overflow-hidden flex flex-col items-center gap-2 text-center">
        <div className={`flex mt-16 mb-4 items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium border transition-colors duration-300 ${!isdark ? 'border-success/30 bg-success/10 text-success' : 'border-emerald-800/30 bg-emerald-800/10 text-emerald-600'}`}>
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${!isdark ? 'bg-success' : 'bg-emerald-500'}`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${!isdark ? 'bg-success' : 'bg-emerald-500'}`}></span>
          </span>
          Smart Parking Surveillance for Education
        </div>
        <div className="max-w-4xl">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
            <span className={`bg-clip-text text-transparent bg-gradient-to-r ${!isdark ? 'from-white to-gray-400' : 'from-gray-900 to-gray-600'}`}>The solution for your</span>
            <br />
            <span className={`bg-clip-text text-transparent bg-gradient-to-r ${!isdark ? 'from-emerald-100 to-emerald-400' : 'from-emerald-800 to-teal-500'}`}>parking surveillance.</span>
          </h1>
        </div>
        <p className={`max-w-2xl text-xl ${isdark ? 'text-base-content' : 'text-base-content/70'} mt-2`}>Monitor, manage, and secure parking spaces with a platform designed specifically for schools, students, and faculty.</p>
        <div className="flex gap-2 mt-4 mb-24">
          <Link href='/login' className={`btn btn-soft btn-lg w-40 bg-base-300 rounded-box ${!isdark ? 'bg-success text-black hover:bg-success/80 shadow-lg shadow-success/30' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-500/30 border-emerald-600'}`}>Signup</Link>
          <button className="btn btn-ghost w-40 btn-lg rounded-box border-base-content/40 border hover:border-base-content/0 text-base-content">Preview</button>
        </div>
        <div className="w-full max-w-6xl flex items-end">
          <img src={!isdark ? 'main-dark.png' : 'main-light.png'} className="w-full rounded-lg shadow-2xl ring-1 ring-black/5" />
        </div>
      </div>
    </div>
  );
}