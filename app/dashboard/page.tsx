'use client';

import Header from "@/app/components/Header";
import { useEffect, useState } from 'react';
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function Dashboard() {
  const [detection, setDetection] = useState(null);
  const logs = useQuery(api.function.getAllLogs);

  const getTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  useEffect(() => {
    const fetchDetection = async () => {
      try {
        const res = await fetch('http://192.168.0.137:5000/api/latest_detection');
        const data = await res.json();
        
        if (data.plate) {
          setDetection(data);
        }
      } catch (error) {
        console.error("Failed to fetch detection:", error);
      }
    };

    const interval = setInterval(fetchDetection, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className='w-screen h-screen bg-base-100'>
      <Header />
      <div className="flex flex-col gap-2 container mx-auto p-4">
        <div className='flex justify-center items-center gap-2'>
          <div className='skeleton w-120 h-67.5'>
            <img className='rounded w-120 h-67.5' src="http://192.168.0.137:5000/video_feed" onError={(e) => {e.currentTarget.style.display = 'none';}} />
          </div>
          <div className='w-100 h-60 flex items-center justify-center'>
            {detection ? (
              <div className="bg-base-300 rounded">
                <img src={`data:image/jpeg;base64,${detection.image_b64}`} className="w-100 rounded-t"/>
                <div className="flex justify-between px-1 py-0.5">
                  <h3>Plate: {detection.plate}</h3>
                  <p>Time: {new Date(detection.timestamp * 1000).toLocaleTimeString()}</p>
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
            <div key={log.carPlate} className="list-row bg-base-300 flex justify-between">
              <p className='text-lg'>{log.carPlate}</p>
              <p className='text-base-content/60'>{getTime(log._creationTime)}</p>
            </div>
          ) : (
            <div className="skeleton bg-base-300 w-full h-15 rounded"></div>
          )}
        </div>
      </div>
    </div>
  );
}
