'use client';

import Header from "@/app/components/Header";
import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function Dashboard() {
  const logs = useQuery(api.function.getAllLogs);
  const [selected, setSelected] = useState(null);
  const matchedUser = useQuery(
    api.function.getUserForPlate, 
    selected?.carPlate ? { carPlate: selected.carPlate } : "skip"
  );

  return (
    <div className='w-screen h-screen bg-base-100'>
      <Header />
      <div className="flex flex-col gap-4 container mx-auto p-4">
        <div className='flex justify-center items-center gap-2'>
          <div className='skeleton w-120 h-67.5 relative shadow-sm'>
            {/* <img className='rounded w-full h-full' src="http://192.168.0.137:5000/video_feed" /> */}
            <img className='rounded w-full h-full' src="https://tkhsecurity.com/wp-content/uploads/2025/04/box-5-1920x1080.png" />
            <div className="size-2 animate-pulse bg-red-300 top-1 right-1 rounded-full absolute" />
            <div className="top-0 left-0 absolute bg-base-100/60 backdrop-blur text-base-content rounded-tl rounded-br p-1">Student Parking Entrance</div>
          </div>
          <div className='w-100 h-60 flex items-center justify-center'>
            {logs ? logs?.slice(-1).map((log) =>
              <div key={log.carPlate} className="bg-base-300 rounded">
                <div className="skeleton w-100 h-53 rounded-t">
                  {/* <img src={`http://192.168.0.137:3923/images/${log.fileTitle}`} className="w-full h-full object-cover rounded-t"/> */}
                  <img className='object-cover rounded-t w-full h-full' src="https://tkhsecurity.com/wp-content/uploads/2025/04/box-5-1920x1080.png" />
                </div>
                <div className="flex justify-between text-base-content p-1">
                  <h3>Plate: {log.carPlate}</h3>
                  <p>{new Date(log._creationTime).toLocaleTimeString()}</p>
                </div>
              </div>
            ) : (
              <div className="skeleton bg-base-300 w-full h-full rounded"></div>
            )}
          </div>
        </div>
        <div className="w-sm mx-auto list gap-0.5 text-base-content shadow-sm bg-base-200 rounded-box p-1">
          <p className='p-2 text-lg opacity-60 tracking-wide'>Latest Logs</p>  
          {logs ? logs?.slice(-5).reverse().map((log, i) =>
            <button onClick={() => { document.getElementById('my_modal_1').showModal(); setSelected(log)}} key={i} className="btn btn-xl list-row items-center bg-base-300 flex justify-between">
              <p className='text-lg'>{log.carPlate}</p>
              <p className='text-base-content/60 text-sm'>{new Date(log._creationTime).toLocaleString()}</p>
            </button>
          ) : (
            <div className="skeleton bg-base-300 w-full h-15 rounded"></div>
          )}
        </div>
      </div>
      <dialog id="my_modal_1" className="modal text-base-content">
        <div className="modal-box">
          <h3 className="font-bold text-lg">{selected?.carPlate}</h3>
          <p className="pb-2">{new Date(selected?._creationTime).toLocaleString()}</p>
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
