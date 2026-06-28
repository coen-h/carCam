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
    <div className='w-full h-dvh flex flex-col bg-base-100 overflow-hidden'>
      <Background />
      <Header setIsDarkCom={setIsdarkCom} />
      <div className="flex max-md:flex-col w-full max-md:flex-1 justify-center gap-2 max-w-[1800px] md:h-full min-h-0 mx-auto p-2">
        <div className="card backdrop-blur bg-base-200 flex-1 w-full h-full shadow-md">
          <figure className="skeleton w-full h-full rounded-t-box rounded-b-none">
            {/* {matchedUser ? (
              <img src="https://tkhsecurity.com/wp-content/uploads/2025/04/box-5-1920x1080.png" alt="Parking Lot" />
            ) : ( */}
              <img className='object-cover aspect-video rounded-t-box w-full h-full opacity-0' src="https://tkhsecurity.com/wp-content/uploads/2025/04/box-5-1920x1080.png" />
            {/* )} */}
          </figure>
          <div className="card-body bg-base-100 p-4 rounded-b-box">
            <div className="flex items-center justify-between gap-2">
              {matchedUser ? (
                <>
                  <h2 className="card-title text-primary font-bold">{matchedUser?.carPlate}</h2>
                  <div className="flex items-center">
                    <p className="badge bg-primary/10 rounded-box text-primary font-medium text-xs min-w-18">{user?.userLicense}</p>
                    <p className="badge bg-primary/10 rounded-box text-primary font-medium text-xs min-w-32">{user?._creationTime && (new Date(user?._creationTime).toLocaleString())}</p>
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
                <p className="text-base-content/60">{matchedUser?.carYear} {matchedUser?.carModel}</p>
              ) : (
                <div className="h-5.25 w-60 skeleton" />
              )}
            </div>
          </div>
        </div>
        <div className="w-100 max-xl:w-80 max-md:w-full gap-0.5 max-md:mb-14 text-base-content shadow-md border border-base-200 bg-base-100 backdrop-blur rounded-box overflow-y-scroll">
          <div className='flex items-center justify-between bg-base-200 px-2 py-1 rounded-t-box'>
            <p className='p-2 text-sm tracking-wider font-semibold text-base-content/70 uppercase'>Recent Entries</p>  
            <p className='text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded-box'>{logs?.length || 0} Total</p>
          </div>
          <div className="p-1 flex flex-col gap-1">
            {logs ? logs?.slice(-5).reverse().map((log) =>
              <button key={log._id} className="w-full group flex items-center justify-between p-3 bg-base-100 max-md:bg-base-200 max-md:border-primary/10 hover:bg-base-200 border border-transparent hover:border-primary/30 rounded-xl transition-all duration-200 ease-in-out cursor-pointer text-left">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-base-300 max-md:bg-primary group-hover:bg-primary transition-colors" />
                  <span className='font-semibold text-base-content group-hover:text-primary transition-colors'>{log.carPlate}</span>
                </div>
                <p className='text-base-content/60 text-xs font-medium'>{new Date(log._creationTime).toLocaleTimeString()}</p>
              </button>
            ) : (
              <>
                <div className="skeleton bg-base-300 w-full h-15 rounded"></div>
                <div className="skeleton bg-base-300 w-full h-15 rounded"></div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}