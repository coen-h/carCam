'use client';

import { useState, useMemo } from 'react';
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Filter, X, CarFront} from "lucide-react";
import Background from "@/app/components/Background";
import OverlayModal from "@/app/components/OverlayModal";
import Header from "@/app/components/Header";

interface SelectedProps {
  carPlate: string;
  _creationTime: number;
  totalEntries?: string;
  carModel?: string;
  carYear?: string;
}

export default function Vehicles() {
  const knownVehicles = useQuery(api.function.getAllKnown);
  const unknownVehicles = useQuery(api.function.getAllUnknown);
  const [input, setInput] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selected, setSelected] = useState(null as SelectedProps | null);
  const [isdark, setIsdarkCom] = useState<boolean | null>(null);
  const matchedUser = useQuery(
    api.function.getUserForPlate, 
    selected?.carPlate ? { carPlate: selected.carPlate } : "skip"
  );

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
    <div className='w-screen min-h-screen bg-base-100'>
      <Background />
      <Header setIsDarkCom={setIsdarkCom} />
      <div className="mx-auto w-xl max-sm:w-full p-2">
        <div className='list text-base-content gap-0.5 bg-base-200 rounded-box p-2'>
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
          <div className='flex flex-col gap-1 h-min max-h-120 overflow-scroll'>
            {newVehicle?.map((vehicle) => (
              <li onClick={() => { (document.getElementById('my_modal_1') as HTMLDialogElement).showModal(); setSelected(vehicle)}} className='list-row bg-base-300 relative cursor-pointer hover:bg-base-200 transition items-center' key={vehicle._id}>
                {/* <img src={vehicle.image} className="rounded w-10 h-10" /> */}
                <CarFront className="rounded w-10 h-10" />
                <p>{vehicle.carPlate}</p>
                <p className='absolute -top-3 right-1 bg-base-100 border-base-100 p-1 rounded-box text-sm'>{new Date(vehicle._creationTime).toLocaleString()}</p>
              </li>
            ))}
          </div>
        </div>
      </div>
      <OverlayModal mainText={selected?.carPlate} primaryText={matchedUser?.name} secondaryText={matchedUser?.userLicense} creationTime={selected?._creationTime} matched={matchedUser} image={matchedUser?.image}  />
    </div>
  );
}
