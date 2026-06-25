'use client';

import Header from "@/app/components/Header";
import Background from "@/app/components/Background";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface SelectedProps {
  carPlate: string;
  _creationTime: number;
  totalEntries?: string;
  carModel?: string;
  carYear?: string;
}

export default function Dashboard() {
  const logs = useQuery(api.function.getAllLogs);
  const [selected, setSelected] = useState(null as SelectedProps | null);
  const [isdark, setIsdarkCom] = useState<boolean | null>(null);
  const matchedUser = useQuery(
    api.function.getUserForPlate, 
    selected?.carPlate ? { carPlate: selected.carPlate } : "skip"
  );

  return (
    <div className='w-screen min-h-screen bg-base-100'>
      <Background />
      <Header setIsDarkCom={setIsdarkCom} />
      <div className="flex max-md:flex-col justify-center gap-2 xl:container mx-auto px-2 pt-2">
          <div className='skeleton aspect-video w-full relative shadow-sm'>
            {/* <img className='rounded w-full h-full' src="http://192.168.0.137:5000/video_feed" /> */}
            {/* <img className='rounded w-full h-full object-cover' src="https://tkhsecurity.com/wp-content/uploads/2025/04/box-5-1920x1080.png" /> */}
            <div className="size-2 animate-pulse bg-red-300 top-1 right-1 rounded-full absolute" />
            <div className="top-0 left-0 absolute bg-base-100/60 backdrop-blur text-base-content rounded-tl rounded-br p-1">Student Parking Entrance</div>
          </div>
          <div className='flex flex-col gap-2 w-100 max-lg:w-64 max-md:w-full items-stretch'>
            <div className='w-full max-lg:hidden aspect-video flex items-center justify-center'>
              {logs ? logs?.slice(-1).map((log) =>
                <div key={log.carPlate} className="bg-base-300 rounded">
                  <div className="skeleton w-full h-full rounded-t">
                    {/* <img src={`http://192.168.0.137:3923/images/${log.fileTitle}`} className="w-full h-full object-cover rounded-t"/> */}
                    <img className='object-cover aspect-video rounded-t w-full h-full opacity-0' src="https://tkhsecurity.com/wp-content/uploads/2025/04/box-5-1920x1080.png" />
                  </div>
                  <div className="flex justify-between text-base-content items-center p-1">
                  <h3>Plate: {log.carPlate}</h3>
                    <p className='text-sm'>{new Date(log._creationTime).toLocaleTimeString()}</p>
                  </div>
                </div>
              ) : (
                <div className="skeleton bg-base-300 w-full h-full rounded"></div>
              )}
            </div>
            <div className="w-full md:flex-1 list gap-0.5 text-base-content shadow-sm bg-base-200 rounded-box p-1 overflow-y-auto">
              <p className='p-2 text-lg opacity-60 tracking-wide'>Latest Logs</p>  
              {logs ? logs?.slice(-5).reverse().map((log) =>
                <button onClick={() => { (document.getElementById('my_modal_1') as HTMLDialogElement).showModal(); setSelected(log)}} key={log._id} className="btn btn-xl list-row items-center bg-base-300 flex max-md:flex-row max-lg:flex-col justify-between max-md:justify-between max-lg:justify-center max-lg:gap-1 max-md:gap-4">
                  <p className='text-lg'>{log.carPlate}</p>
                  <p className='text-base-content/60 text-xs'>{new Date(log._creationTime).toLocaleString()}</p>
                </button>
              ) : (
                <div className="skeleton bg-base-300 w-full h-15 rounded"></div>
              )}
            </div>
          </div>
        
      </div>
      <dialog id="my_modal_1" className="modal text-base-content">
        <div className="modal-box">
          <h3 className="font-bold text-lg">{selected?.carPlate}</h3>
          <p className="pb-2">{selected ? new Date(selected?._creationTime).toLocaleString() : ""}</p>
          <div className="p-4 bg-base-200 rounded">
            <h4 className="font-semibold">Registered User Info:</h4>
            {matchedUser === undefined ? (
              <p className="loading loading-dots loading-sm"></p>
            ) : matchedUser ? (
              <div className="flex items-center gap-2">
                <img src={matchedUser.image} className="rounded w-10 h-10" />
                <div>
                  <p>{matchedUser.name || "Known Vehicle"}</p>
                  <p>{matchedUser.userLicense || "Unknown"}</p>
                </div>
              </div>
            ) : (
              <p className="text-error">Unknown driver / Unregistered plate</p>
            )}
          </div>
          <div className="modal-action">
            <form method="dialog">
              <button className="btn">Close</button>
            </form>
          </div>
        </div>
      </dialog>
    </div>
  );
}
