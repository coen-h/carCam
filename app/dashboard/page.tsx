'use client';

import Header from "@/app/components/Header";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { redirect } from "next/navigation";

export default function Dashboard() {
  const logs = useQuery(api.function.getAllLogs);
  const user = useQuery(api.function.getUser);
  const [selected, setSelected] = useState(false);

  if (!user?.carPlate) {
    redirect("/signup");
  }

  return (
    <div className='w-screen h-screen bg-base-100'>
      <Header />
      <div className="flex flex-col gap-2 container mx-auto p-4">
        <div className='flex justify-center items-center gap-2'>
          <div className='skeleton w-120 h-67.5'>
            {/* <img className='rounded w-full h-full' src="http://192.168.0.137:5000/video_feed" /> */}
            <img className='rounded w-full h-full' src="https://tkhsecurity.com/wp-content/uploads/2025/04/box-5-1920x1080.png" />
          </div>
          <div className='w-100 h-60 flex items-center justify-center'>
            {logs ? logs?.slice(-1).map((log) =>
              <div key={log.carPlate} className="bg-base-300 rounded">
                <div className="skeleton w-100 h-53 rounded-t">
                  {/* <img src={`http://192.168.0.137:3923/images/${log.fileTitle}`} className="w-full h-full object-cover rounded-t"/> */}
                  <img className='object-cover rounded-t w-full h-full' src="https://tkhsecurity.com/wp-content/uploads/2025/04/box-5-1920x1080.png" />
                </div>
                <div className="flex justify-between px-1 py-0.5">
                  <h3>Plate: {log.carPlate}</h3>
                  <p>{new Date(log._creationTime).toLocaleTimeString()}</p>
                </div>
              </div>
            ) : (
              <div className="skeleton bg-base-300 w-full h-full rounded"></div>
            )}
          </div>
        </div>
        <div className="w-sm mx-auto list gap-0.5 text-base-content">
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
      <dialog id="my_modal_1" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">{selected.carPlate}</h3>
          <p className="py-4">{selected._creationTime}</p>
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
