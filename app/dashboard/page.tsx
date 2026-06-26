'use client';

import Header from "@/app/components/Header";
import Background from "@/app/components/Background";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import OverlayModal from "@/app/components/OverlayModal";

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
    <div className='w-full h-dvh flex flex-col bg-base-100 overflow-hidden'>
      <Background />
      <Header setIsDarkCom={setIsdarkCom} />
      <div className="flex max-md:flex-col w-full max-md:flex-1 max-md:min-h-0 justify-center gap-2 xl:container mx-auto p-2">
          <div className='skeleton aspect-video w-full relative shadow-md'>
            {/* <img className='rounded w-full h-full' src="http://192.168.0.137:5000/video_feed" /> */}
            {/* <img className='rounded w-full h-full object-cover' src="https://tkhsecurity.com/wp-content/uploads/2025/04/box-5-1920x1080.png" /> */}
            <div className="size-2 animate-pulse bg-primary top-2 right-2 rounded-full absolute" />
            <div className="top-0 left-0 absolute bg-base-100/60 backdrop-blur text-base-content rounded-tl rounded-br p-1">Student Parking Entrance</div>
          </div>
          <div className='flex flex-col gap-2 w-100 max-lg:w-64 max-md:w-full max-md:flex-1 min-h-0 items-stretch'>
            <div className='w-full max-lg:hidden aspect-video flex items-center justify-center shadow-md'>
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
            <div className="w-full flex-1 list gap-0.5 max-md:mb-14 text-base-content shadow-md border border-base-200 bg-base-100 rounded-box p-1 overflow-y-scroll">
              <p className='p-2 text-lg opacity-60 tracking-wide'>Latest Logs</p>  
              {logs ? logs?.slice(-5).reverse().map((log) =>
                <button onClick={() => { (document.getElementById('my_modal_1') as HTMLDialogElement).showModal(); setSelected(log)}} key={log._id} className="group btn btn-xl list-row items-center bg-base-200 flex max-md:flex-row max-lg:flex-col justify-between max-md:justify-between max-lg:justify-center max-lg:gap-1 max-md:gap-4 hover:border-primary/40">
                  <p className='text-lg group-hover:text-primary'>{log.carPlate}</p>
                  <p className='text-base-content/60 text-xs'>{new Date(log._creationTime).toLocaleString()}</p>
                </button>
              ) : (
                <div className="skeleton bg-base-300 w-full h-15 rounded"></div>
              )}
            </div>
          </div>
        
      </div>
      <OverlayModal mainText={matchedUser?.carPlate} primaryText={matchedUser?.name} secondaryText={matchedUser?.userLicense} creationTime={selected?._creationTime} matched={matchedUser} image={matchedUser?.image} />
    </div>
  );
}
