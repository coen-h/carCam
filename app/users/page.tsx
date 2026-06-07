'use client';

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Header from "@/app/components/Header";

export default function Users() {
  const users = useQuery(api.function.getAllUsers);

  const getTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className='w-screen h-screen bg-base-100'>
      <Header />
      <div className="container mx-auto p-2 w-lg bg-base-200 rounded-box m-4">
        <div className='list text-base-content'>
          <p className='p-2 text-lg opacity-60 tracking-wide'>Students</p>
          {users?.map((user) => (
            <li className='list-row bg-base-300 relative' key={user.id}>
              <img src={user.image} className="rounded w-10 h-10" />
              <div>
                <p>{user.name}</p>
                <p className='text-xs font-light text-base-content/70'>{user.email}</p>
              </div>
              <p className='absolute -top-3 right-1 bg-base-100 border-base-100 p-1 rounded-box'>{getTime(user._creationTime)}</p>
            </li>
          ))}
        </div>
      </div>
    </div>
  );
}
