'use client';

import Header from "@/app/components/Header";
import Background from "@/app/components/Background";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function Dashboard() {
  const user = useQuery(api.function.getUser);
  const [isdark, setIsdarkCom] = useState<boolean | null>(null);
  
  const matchedUser = useQuery(
    api.function.getVehicleFromPlate,
    user?.carPlate ? { carPlate: user.carPlate } : "skip"
  );

  const logs = useQuery(
    api.function.getLogsForPlate, 
    user?.carPlate ? { carPlate: user.carPlate } : "skip"
  );

  return (
    <div className='w-screen h-screen bg-base-100'>
      <Background />
      <Header setIsDarkCom={setIsdarkCom} />
      <div className="flex items-stretch gap-2 xl:container mx-auto p-4">
        <div className="card bg-base-200 aspect-video w-full shadow-sm">
          <figure className="w-full h-full">
            {matchedUser ? (
              <img src="https://tkhsecurity.com/wp-content/uploads/2025/04/box-5-1920x1080.png" alt="Parking Lot" />
            ) : (
              <div className="h-full w-full skeleton rounded-b-none" />
            )}
          </figure>
          <div className="card-body">
            <div className="flex items-center justify-between gap-2">
              {matchedUser ? (
                <>
                  <h2 className="card-title text-base-content">{matchedUser?.carPlate}</h2>
                  <div className="flex items-center">
                    <p className="badge text-xs min-w-18">{user?.userLicense}</p>
                    <p className="badge text-xs min-w-32">{user?._creationTime && (new Date(user?._creationTime).toLocaleString())}</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="h-6.75 w-16 skeleton" />
                  <div className="flex items-center gap-1">
                    <p className="skeleton h-6 w-18">{user?.userLicense}</p>
                    <p className="skeleton h-6 w-32">{user?._creationTime && (new Date(user?._creationTime).toLocaleString())}</p>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center">
              {matchedUser ? (
                <p className="text-base-content">Vehicle Make: {matchedUser?.carModel} - {matchedUser?.carYear}</p>
              ) : (
                <div className="h-5.25 w-60 skeleton" />
              )}
            </div>
          </div>
        </div>
        <div className="list gap-1 bg-base-200 rounded-box shadow-sm p-1 w-100 overflow-y-auto">
          <p className='p-2 text-lg opacity-60 tracking-wide text-base-content'>Latest Logs</p>  
          {logs ? logs?.slice(-5).map((log) =>
            <button key={log._id} className="btn btn-xl flex list-row bg-base-300 relative items-center">
              <p className='text-base text-base-content'>{log.carPlate}</p>
              <p className='text-base-content/60 text-xs'>{new Date(log._creationTime).toLocaleString()}</p>
            </button>
          ) : (
            <div className="flex flex-col gap-1">
              <div className="skeleton bg-base-300 w-full h-15 rounded-box"></div>
              <div className="skeleton bg-base-300 w-full h-15 rounded-box"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}