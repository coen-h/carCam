'use client';

import Header from "@/app/components/Header";
import { useEffect, useState } from 'react';

export default function Dashboard() {
  const [detection, setDetection] = useState(null);

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
    <div>
      <Header />
      <div className="flex justify-center items-center gap-2 container mx-auto p-4">
        <div className='skeleton w-120 h-67.5'>
          <img className='rounded w-120 h-67.5' src="http://192.168.0.137:5000/video_feed" onError={(e) => {e.currentTarget.style.display = 'none';}} />
        </div>
        <div className='skeleton w-100 h-60 flex items-center justify-center'>
          {detection ? (
            <div className="bg-base-100 rounded">
              <img src={`data:image/jpeg;base64,${detection.image_b64}`} className="w-100 rounded-t"/>
              <div className="flex justify-between px-1 py-0.5">
                <h3>Plate: {detection.plate}</h3>
                <p>Time: {new Date(detection.timestamp * 1000).toLocaleTimeString()}</p>
              </div>
            </div>
          ) : (
            <p>Waiting for vehicles...</p>
          )}
        </div>
      </div>
    </div>
  );
}
