'use client';

import { useState, useMemo } from 'react';
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CarFront, Search, Calendar, ChevronRight } from "lucide-react";
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
  const [selectedType, setSelectedType] = useState('all');
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

  const isLoading = knownVehicles === undefined || unknownVehicles === undefined;

  return (
    <div className='w-full h-dvh flex flex-col bg-base-100 overflow-hidden'>
      <Background />
      <Header setIsDarkCom={setIsdarkCom} />
      <div className="container mx-auto max-w-2xl max-md:max-w-3xl w-full p-2 flex-1 max-md:flex max-md:flex-col min-h-0">
        <div className='list max-md:mb-14 backdrop-blur-md flex-1 min-h-0 text-base-content gap-0.5 bg-base-200 shadow-2xl border border-base-200 rounded-box p-4'>
          <div className='flex items-center justify-between gap-1 mb-4'>
            <div>
              <p className='text-2xl font-semibold tracking-tight'>Vehicles</p>
              <p className='text-sm text-base-content/60 max-sm:hidden'>Manage and track identified vehicles</p>
            </div>
            <div className='join p-1 bg-base-100 rounded-lg'>
              <button className={`join-item btn btn-sm border-none ${selectedType === 'all' ? 'bg-base-200 shadow-sm hover:bg-base-100 text-base-content' : 'bg-transparent hover:bg-base-300 text-base-content/60'}`} onClick={() => setSelectedType('all')}>
                All
              </button>
              <button className={`join-item btn btn-sm border-none ${selectedType === 'known' ? 'bg-base-200 shadow-sm hover:bg-base-100 text-base-content' : 'bg-transparent hover:bg-base-300 text-base-content/60'}`} onClick={() => setSelectedType('known')}>
                Known
              </button>
              <button className={`join-item btn btn-sm border-none ${selectedType === 'unknown' ? 'bg-base-200 shadow-sm hover:bg-base-100 text-base-content' : 'bg-transparent hover:bg-base-300 text-base-content/60'}`} onClick={() => setSelectedType('unknown')}>
                Unknown
              </button>
            </div>
          </div>
          <div className='relative'>
            <div className="absolute top-2 left-2 flex items-center pointer-events-none">
                <Search className="size-6 z-2 text-base-content/40" />
              </div>
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Search..." className='input mb-2 w-full pl-10'></input>
          </div>
          <div className='flex flex-col gap-1 h-full overflow-y-scroll'>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <span className="loading loading-spinner loading-lg text-primary"></span>
                <p className="text-base-content/60 text-sm">Loading...</p>
              </div>
            ) : newVehicle.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <p className="text-base-content/60 text-sm">No vehicles found.</p>
              </div> 
              
            ) : newVehicle?.map((vehicle) => (
              <li onClick={() => { (document.getElementById('my_modal_1') as HTMLDialogElement).showModal(); setSelected(vehicle)}} className='p-2 group list-row bg-base-100 relative cursor-pointer transition items-center border border-base-300 hover:border-primary/40' key={vehicle._id}>
                {/* <img src={vehicle.image} className="rounded w-10 h-10" /> */}
                <div className='bg-base-200 p-3 rounded-lg group-hover:bg-primary group-hover:text-primary-content transition'>
                  <CarFront className="rounded size-6 opacity-60" />
                </div>
                <div>
                  <p className='text-lg font-bold'>{vehicle.carPlate}</p>
                  <div className='flex items-center gap-1 text-base-content/60 mt-1'>
                    <Calendar className='size-3' />
                    <p className='text-xs'>{new Date(vehicle._creationTime).toLocaleString()}</p>
                  </div>
                </div>
                <ChevronRight className='size-4 opacity-0 text-primary group-hover:opacity-100 group-hover:-translate-x-1 transition-transform' />
              </li>
            ))}
          </div>
        </div>
      </div>
      <OverlayModal mainText={selected?.carPlate} primaryText={matchedUser?.name} secondaryText={matchedUser?.userLicense} creationTime={selected?._creationTime} matched={matchedUser} image={matchedUser?.image}  />
    </div>
  );
}
