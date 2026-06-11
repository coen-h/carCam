'use client';

import { useState, useMemo } from 'react';
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Filter, X, CarFront} from "lucide-react";
import Header from "@/app/components/Header";

export default function Vehicles() {
  const knownVehicles = useQuery(api.function.getAllKnown);
  const unknownVehicles = useQuery(api.function.getAllUnknown);
  const [input, setInput] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const newVehicle = useMemo(() => {
    if (!knownVehicles || !unknownVehicles) return [];
    const whichVehicles = selectedType === 'known' ? knownVehicles : selectedType === 'unknown' ? unknownVehicles : [...knownVehicles, ...unknownVehicles];

    let filteredVehicles = whichVehicles;

    const query = input.trim().toLowerCase();
    
    if (query) {
      filteredVehicles = whichVehicles.filter((vehicle) =>
        vehicle.carPlate.toLowerCase().includes(query)
      );
    }

    return filteredVehicles;
  }, [knownVehicles, unknownVehicles, input, selectedType]);


  return (
    <div className='w-screen h-screen bg-base-100'>
      <Header />
      <div className="container mx-auto p-2 w-lg bg-base-200 m-4 rounded-box">
        <div className='list text-base-content gap-0.5'>
          <p className='p-2 text-lg opacity-60 tracking-wide'>Vehicles</p>
          <div className='flex gap-1'>
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Search..." className='input mb-2 w-full flex-1'></input>
            <button className={`swap swap-rotate btn bg-base-100 ${isDropdownOpen ? 'swap-active' : ''}`} popoverTarget="popover-1" style={{ anchorName: "--anchor-1" }}>
              <input type="checkbox" />
              <Filter className='swap-off size-5' />
              <X className='swap-on size-5' />
            </button>
            <ul onToggle={(e) => setIsDropdownOpen(e.newState === 'open')} className="dropdown menu w-52 bg-base-100 shadow-sm rounded-box mt-1" popover="auto" id="popover-1" style={{ positionAnchor: "--anchor-1" }}>
              <li>
                <select onChange={(e) => setSelectedType(e.target.value)} className='select border-0 w-full'>
                  <option value=''>All Cars</option>
                  <option value='known'>Known</option>
                  <option value='unknown'>Unknown</option>
                </select>
              </li>
            </ul>
          </div>
          <div className='flex flex-col gap-1 h-[500px] overflow-scroll'>
            {newVehicle?.map((vehicle) => (
              <li className='list-row bg-base-300 relative' key={vehicle._id}>
                {/* <img src={vehicle.image} className="rounded w-10 h-10" /> */}
                <CarFront className="rounded w-10 h-10" />
                <p>{vehicle.carPlate}</p>
                <p className='absolute -top-3 right-1 bg-base-100 border-base-100 p-1 rounded-box'>{new Date(vehicle._creationTime).toLocaleString()}</p>
              </li>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
