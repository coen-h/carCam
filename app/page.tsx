'use client';

import { Menu } from "lucide-react";
import { useEffect, useState } from 'react';

export default function Home() {
  const [detection, setDetection] = useState(null);

  // Poll the API every 3 seconds to check for new license plates
  useEffect(() => {
    const fetchDetection = async () => {
      try {
        const res = await fetch('http://192.168.0.137:5000/api/latest_detection');
        const data = await res.json();
        
        // Only update state if a plate has actually been detected
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
      <div className="navbar flex justify-between shadow-inner bg-white/10">
        <button className="btn btn-dash text-lg">carCam</button>
        <div className="dropdown dropdown-end">
          <div tabIndex={0} className="avatar btn btn-ghost btn-square">
            <Menu width={32} />
          </div>
          <ul tabIndex={-1} className="dropdown-content menu w-54 bg-base-100 rounded-box">
            <li><a>Item 1</a></li>
            <li><a>Item 2</a></li>
          </ul>
        </div>
      </div>
      <div className="hero min-h-screen" style={{
        backgroundImage:
        "url(https://img.daisyui.com/images/stock/photo-1507358522600-9f71e620c44e.webp)",
      }}>
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <p>test</p>
        </div>
        
      </div>
      <img 
          src="http://192.168.0.137:5000/video_feed" 
          style={{ width: '640px', borderRadius: '8px' }} 
        />
        {detection ? (
          <div>
            <h3>Plate: {detection.plate}</h3>
            <p>Time: {new Date(detection.timestamp * 1000).toLocaleTimeString()}</p>
            <img 
              src={`data:image/jpeg;base64,${detection.image_b64}`} 
              alt="Detected Plate Frame" 
              style={{ width: '400px', border: '2px solid red', borderRadius: '8px' }} 
            />
          </div>
        ) : (
          <p>Waiting for vehicles...</p>
        )}
    </div>
  );
}
