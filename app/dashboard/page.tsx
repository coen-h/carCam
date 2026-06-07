'use client';

import Header from "@/app/components/Header";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function Dashboard() {
  const logs = useQuery(api.function.getAllLogs);

  return (
    <div className='w-screen h-screen bg-base-100'>
      <Header />
      <div className="flex flex-col gap-2 container mx-auto p-4">
        <div className='flex justify-center items-center gap-2'>
          <div className='skeleton w-120 h-67.5'>
            <img className='rounded w-120 h-67.5' src="http://192.168.0.137:5000/video_feed" onError={(e) => {e.currentTarget.style.display = 'none';}} />
          </div>
          <div className='w-100 h-60 flex items-center justify-center'>
            {logs ? logs?.slice(-1).map((log) =>
              <div key={log.carPlate} className="bg-base-300 rounded">
                <img src={`http://192.168.0.137:3923/images/${log.fileTitle}`} className="w-100 rounded-t"/>
                <div className="flex justify-between px-1 py-0.5">
                  <h3>Plate: {log.carPlate}</h3>
                  <p>Time: {new Date(log._creationTime).toLocaleTimeString()}</p>
                </div>
              </div>
            ) : (
              <div className="skeleton bg-base-300 w-full h-full rounded">
              
              </div>
            )}
          </div>
        </div>
        <div className="w-sm mx-auto list text-base-content">
          <p className='p-2 text-lg opacity-60 tracking-wide'>Latest Logs</p>  
          {logs ? logs?.slice(-5).reverse().map((log) =>
            <div key={log.carPlate} className="list-row items-center bg-base-300 flex justify-between">
              <p className='text-lg'>{log.carPlate}</p>
              <p className='text-base-content/60'>{new Date(log._creationTime).toLocaleString()}</p>
            </div>
          ) : (
            <div className="skeleton bg-base-300 w-full h-15 rounded"></div>
          )}
        </div>
      </div>
    </div>
  );
}
