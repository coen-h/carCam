'use client';

import Header from "@/app/components/Header";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { redirect } from "next/navigation";

export default function Home() {
  const user = useQuery(api.function.getUser);

  if (!user?.carPlate) {
    if (user?.role === "teacher" || user?.role === "admin") {
      redirect('/dashboard');
    } else {
      redirect('/home');
    }
  }

  return (
    <div className="w-screen h-screen bg-base-100">
      <Header />
    </div>
  );
}
