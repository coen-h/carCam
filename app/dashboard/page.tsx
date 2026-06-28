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
      <div className="flex max-md:flex-col w-full max-md:flex-1 justify-center gap-2 max-w-[1800px] md:h-full min-h-0 mx-auto p-2">
          <div className='skeleton max-md:aspect-video w-full relative shadow-md'>
            {/* <img className='rounded w-full h-full' src="http://192.168.0.137:5000/video_feed" /> */}
            {/* <img className='rounded w-full h-full object-cover' src="https://tkhsecurity.com/wp-content/uploads/2025/04/box-5-1920x1080.png" /> */}
            <div className="absolute top-2 right-2 rounded-box flex items-center gap-1 bg-base-100 px-2 py-1">
              <div className="size-2 animate-pulse bg-primary rounded-full" />
              <p className="text-xs font-semibold tracking-wider text-base-content">LIVE</p>
            </div>
            <div className="bottom-2 left-2 absolute bg-base-100 text-base-content text-sm rounded-box px-2 py-1 font-medium">Student Parking Entrance</div>
          </div>
          <div className='flex flex-col gap-2 w-160 max-xl:w-100 max-md:w-full max-md:flex-1 min-h-0 items-stretch'>
            <div className='w-full bg-base-300 backdrop-blur rounded-box max-md:hidden aspect-video flex items-center justify-center shadow-md border border-base-200'>
              {logs ? logs?.slice(-1).map((log) =>
                <div key={log.carPlate} className="bg-base-100 rounded-box">
                  <div className="skeleton w-full h-full rounded-t-box rounded-b-none">
                    {/* <img src={`http://192.168.0.137:3923/images/${log.fileTitle}`} className="w-full h-full object-cover rounded-t"/> */}
                    <img className='object-cover aspect-video rounded-t-box w-full h-full opacity-0' src="https://tkhsecurity.com/wp-content/uploads/2025/04/box-5-1920x1080.png" />
                  </div>
                  <div className="flex justify-between text-base-content items-center p-2">
                    <div>
                      <p className="text-xs text-base-content/60">License Plate:</p>
                      <h3 className="text-lg font-bold text-primary">{log.carPlate}</h3>
                    </div>
                    <div>
                      <p className="text-xs text-base-content/60">Time:</p>
                      <p className='text-sm font-medium'>{new Date(log._creationTime).toLocaleTimeString()}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="skeleton bg-base-300 w-full h-full rounded-box"></div>
              )}
            </div>
            <div className="w-full flex-1 gap-0.5 max-md:mb-14 text-base-content shadow-md border border-base-200 bg-base-100 backdrop-blur rounded-box overflow-y-scroll">
              <div className='flex items-center justify-between bg-base-200 px-2 py-1 rounded-t-box'>
                <p className='p-2 text-sm tracking-wider font-semibold text-base-content/70 uppercase'>Recent Entries</p>  
                <p className="badge bg-primary/10 border-base-300 rounded-box text-primary font-medium text-xs min-w-18">{logs?.length || 0} Total</p>
              </div>
              <div className="p-1 flex flex-col gap-1">
                {logs ? logs?.slice(-5).reverse().map((log) =>
                  <button onClick={() => { (document.getElementById('my_modal_1') as HTMLDialogElement).showModal(); setSelected(log)}} key={log._id} className="w-full group flex items-center justify-between p-3 bg-base-100 max-md:bg-base-200 max-md:border-primary/10 hover:bg-base-200 border border-transparent hover:border-primary/30 rounded-xl transition-all duration-200 ease-in-out cursor-pointer text-left">
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
      <OverlayModal mainText={matchedUser?.carPlate} primaryText={matchedUser?.name} secondaryText={matchedUser?.userLicense} creationTime={selected?._creationTime} matched={matchedUser} image={matchedUser?.image} />
    </div>
  );
}
