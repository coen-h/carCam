'use client';

import Header from "@/app/components/Header";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { redirect } from "next/navigation";

export default function Home() {
  const user = useQuery(api.function.getUser);

  // if (!user?.carPlate) {
  //   redirect('/dashboard');
  // }

  return (
    <div className="w-screen h-screen codioful overflow-hidden">
      <Header />
      <div className="w-screen h-screen overflow-hidden flex flex-col items-center gap-2 text-center">
        <p className="text-6xl bg-clip-text pb-2 tracking-tight text-transparent bg-gradient-to-br pt-16 from-base-content from-40% to-green-300 w-180">The solution for your car parking surveillance needs.</p>
        <p className="text-base-content/80 text-xl">Purpose-built for students and teachers.</p>
        <div className="flex gap-2 mt-2 mb-16">
          <button className="btn btn-soft btn-lg w-40 bg-base-200 rounded-box">Signup</button>
          <button className="btn btn-ghost w-40 btn-lg rounded-box border-base-content/40 border hover:border-base-content/0">Preview</button>
        </div>
        <div className="w-full h-200 flex items-end">
          <img src='main.png' className="w-7xl mx-auto rounded-lg shadow-2xl" />
        </div>
      </div>
    </div>
  );
}

// rounded-b-xl CARD