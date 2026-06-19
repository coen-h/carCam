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
        <p className={`text-6xl bg-clip-text pb-2 tracking-tight text-transparent bg-linear-to-br pt-24 from-base-content from-50% ${!isdark ? 'to-success' : 'to-emerald-700'} w-180`}>The solution for your car parking surveillance needs.</p>
        <p className="text-base-content/80 text-xl">Purpose-built for students and teachers.</p>
        <div className="flex gap-2 mt-4 mb-24">
          <Link href='/login' className="btn btn-soft btn-lg w-32 bg-base-300 rounded-box">Signup</Link>
          <button className="btn btn-ghost w-32 btn-lg rounded-box border-base-content/40 border hover:border-base-content/0 text-base-content">Preview</button>
        </div>
        <div className="w-full px-60 flex items-end">
          <img src={!isdark ? 'main-dark.png' : 'main-light.png'} className="w-full rounded-lg shadow-2xl ring-1 ring-black/5" />
        </div>
      </div>
    </div>
  );
}