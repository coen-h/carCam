'use client';

import { useAuthActions } from "@convex-dev/auth/react";
import Header from "@/app/components/Header";

export default function Login() {
  const { signIn } = useAuthActions();
  return (
    <div className="w-screen h-screen bg-base-100">
      <Header />
      <div className='absolute top-0 h-screen w-screen flex items-center justify-center'>
        <div className="card card-dash bg-base-300 gap-1 p-2">
          <p className="card-title text-2xl">Login</p>
          <button className="flex-1 btn card-content w-40 py-1" onClick={() => void signIn("google", { redirectTo: "/signup", })}>
            Google
          </button>
        </div>
      </div>
    </div>
  );
}