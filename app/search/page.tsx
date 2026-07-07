'use client';

import { useState, useMemo } from 'react';
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CarFront, Search, Calendar, ChevronRight, User } from "lucide-react";
import Background from "@/app/components/Background";
import OverlayModal from "@/app/components/OverlayModal";
import Header from "@/app/components/Header";

interface VehicleSelectedProps {
  carPlate: string;
  _creationTime: number;
  totalEntries?: string;
  carModel?: string;
  carYear?: string;
}

interface UserSelectedProps {
  name?: string;
  carPlate?: string;
  _creationTime: number;
  totalEntries?: string;
  carModel?: string;
  carYear?: string;
}

export default function SearchPage() {
  const vehicles = useQuery(api.function.getAllVehicles);
  const users = useQuery(api.function.getAllUsers);
  const [input, setInput] = useState('');
  const [type, setType] = useState(true);
  const [selectedType, setSelectedType] = useState('all');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedLicense, setSelectedLicense] = useState('');
  const [userSelected, setUserSelected] = useState(null as UserSelectedProps | null);
  const [vehicleSelected, setVehicleSelected] = useState(null as VehicleSelectedProps | null);
  const [isdark, setIsdarkCom] = useState<boolean | null>(null);

  const matchedUser = useQuery(
    api.function.getUserForPlate, 
    vehicleSelected?.carPlate ? { carPlate: vehicleSelected.carPlate } : "skip"
  );

  const matchedVehicle = useQuery(
    api.function.getVehicleFromPlate, 
    userSelected?.carPlate ? { carPlate: userSelected.carPlate } : "skip"
  );

  const newVehicle = useMemo(() => {
    if (!vehicles) return [];
    let filteredVehicles = vehicles;

    if (selectedType !== "all") {
      filteredVehicles = filteredVehicles.filter(
        (vehicle) => vehicle.type === selectedType
      );
    }

    const query = input.trim().toLowerCase();

    if (query) {
      filteredVehicles = filteredVehicles.filter((vehicle) =>
        vehicle.carPlate.toLowerCase().includes(query)
      );
    }

    return [...filteredVehicles].sort(
      (a, b) => b._creationTime - a._creationTime
    );
  }, [vehicles, input, selectedType]);

  const newUser = useMemo(() => {
    if (!users) return [];
    let filteredUsers = users;

    const query = input.trim().toLowerCase();
    
    if (query) {
      filteredUsers = users.filter((user) =>
        user.name?.toLowerCase().includes(query)
      );
    }

    if (selectedYear) {
      filteredUsers = filteredUsers.filter((user) => user.userYearLevel?.toLowerCase() === selectedYear);
    }

    if (selectedLicense) {
      filteredUsers = filteredUsers.filter((user) => user.userLicense?.toLowerCase() === selectedLicense);
    }

    return filteredUsers;
  }, [users, input, selectedYear, selectedLicense]);

  const isLoadingVehicles = vehicles === undefined;
  const isLoadingUsers = users === undefined;

  return (
    <div className='w-full h-dvh flex flex-col bg-base-100 overflow-hidden'>
      <Background />
      <Header setIsDarkCom={setIsdarkCom} />
      <div className="container mx-auto max-w-2xl max-md:max-w-3xl w-full p-2 flex-1 max-md:flex max-md:flex-col min-h-0">
        <div className='list max-md:mb-14 backdrop-blur-md flex-1 min-h-0 text-base-content gap-0.5 bg-base-200 shadow-2xl border border-base-200 rounded-box p-4 max-md:p-2'>
          <div className='flex items-center gap-3'>
            <div className={`${isdark? 'bg-primary/20' : 'bg-primary/10'} p-2 rounded-lg text-primary max-sm:hidden`}>
              <User className="size-8" />
            </div>
            <div>
              <p className='text-2xl font-semibold tracking-tight'>{type ? 'Vehicles' : 'Students'}</p>
              <p className='text-sm text-base-content/60 line-clamp-1'>{type ? 'Manage and track identified vehicles.' : 'Manage and track student profiles and linked vehicles.'}</p>
            </div>
            <div className='join p-1 bg-base-100 rounded-lg h-min ml-auto'>
              <button className={`join-item btn btn-sm border-none ${type ? 'bg-primary/80 shadow-sm hover:bg-primary/60 text-primary-content' : 'bg-transparent hover:bg-base-300 text-base-content/60'}`} onClick={() => setType(true)}>
                Vehicles
              </button>
              <button className={`join-item btn btn-sm border-none ${!type ? 'bg-primary/80 shadow-sm hover:bg-primary/60 text-primary-content' : 'bg-transparent hover:bg-base-300 text-base-content/60'}`} onClick={() => setType(false)}>
                Students
              </button>
            </div>
          </div>
          <div className='sm:flex max-sm:grid max-sm:grid-cols-2 max-sm:gap-2 gap-1 mt-4'>
            <div className='relative max-sm:order-3 col-span-2 input mb-2 w-full flex-1 items-center flex'>
              <div className="absolute top-1.5 left-1.5 flex items-center pointer-events-none">
                <Search className="size-6 z-2 text-base-content/40" />
              </div>
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Search..." className='focus:outline-none focus:border-primary input w-full pl-6'></input>
            </div>
            {type ? (
              <div className='join p-1 bg-base-100 rounded-lg h-min col-span-2 max-sm:pr-0.5 outline outline-base-content/20'>
                <button className={`join-item max-sm:w-1/3 btn btn-sm border-none ${selectedType === 'all' ? 'bg-primary/80 shadow-sm hover:bg-primary/60 text-primary-content' : 'bg-transparent hover:bg-base-300 text-base-content/60'}`} onClick={() => setSelectedType('all')}>
                  All
                </button>
                <button className={`join-item max-sm:w-1/3 btn btn-sm border-none ${selectedType === 'known' ? 'bg-primary/80 shadow-sm hover:bg-primary/60 text-primary-content' : 'bg-transparent hover:bg-base-300 text-base-content/60'}`} onClick={() => setSelectedType('known')}>
                  Known
                </button>
                <button className={`join-item max-sm:w-1/3 btn btn-sm border-none ${selectedType === 'unknown' ? 'bg-primary/80 shadow-sm hover:bg-primary/60 text-primary-content' : 'bg-transparent hover:bg-base-300 text-base-content/60'}`} onClick={() => setSelectedType('unknown')}>
                  Unknown
                </button>
              </div>
            ) : (
            <>
              <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="max-sm:order-1 select bg-base-100 focus:outline-none focus:border-primary w-32 max-sm:w-full">
                <option value=''>All Years</option>
                <option value='11'>Year 11</option>
                <option value='12'>Year 12</option>
                <option value='13'>Year 13</option>
              </select>
              <select value={selectedLicense} onChange={(e) => setSelectedLicense(e.target.value)} className="max-sm:order-2 select bg-base-100 focus:outline-none focus:border-primary w-32 max-sm:w-full">
                <option value=''>All Licenses</option>
                <option value='learners'>Learners</option>
                <option value='restricted'>Restricted</option>
                <option value='full'>Full</option>
              </select>
            </>
            )}
            
          </div>
          {type ? (
          <>
          <div className='flex flex-col gap-1 md:max-h-120 h-full overflow-y-scroll'>
            {isLoadingVehicles ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <span className="loading loading-spinner loading-lg text-primary"></span>
                <p className="text-base-content/60 text-sm">Loading...</p>
              </div>
            ) : newVehicle.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <p className="text-base-content/60 text-sm">No vehicles found.</p>
              </div> 
              
            ) : newVehicle?.map((vehicle) => (
              <li onClick={() => { (document.getElementById('my_modal_1') as HTMLDialogElement).showModal(); setVehicleSelected(vehicle)}} className='p-2 group list-row bg-base-100 relative cursor-pointer transition items-center border border-base-300 hover:border-primary/40' key={vehicle._id}>
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
                <ChevronRight className='size-4 opacity-0 text-primary group-hover:opacity-100 group-hover:-translate-x-1 transition-all' />
              </li>
            ))}
          </div>
          </>
          ) : (
          <>
          <div className='flex flex-col gap-1 md:max-h-120 h-full overflow-y-scroll'>
            {isLoadingUsers ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <span className="loading loading-spinner loading-lg text-primary"></span>
                <p className="text-base-content/60 text-sm">Loading...</p>
              </div>
            ) : newUser.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <p className="text-base-content/60 text-sm">No students found.</p>
              </div>
            ) : newUser.map((user) => (
              <li className='list-row p-1 items-center bg-base-100 relative cursor-pointer group transition border border-base-300 hover:border-primary/40' key={user._id} onClick={() => { (document.getElementById('my_modal_1') as HTMLDialogElement).showModal(); setUserSelected(user)}}>
                {/* <img src="https://cdn.pixabay.com/photo/2023/02/18/11/00/icon-7797704_640.png" className="rounded-lg size-12 ml-3 max-sm:ml-1.5 my-3 max-sm:my-1" /> */}
                <div className="avatar avatar-placeholder">
                  <div className="bg-neutral text-neutral-content size-12 rounded-box ml-3 max-sm:ml-1.5 my-3 max-sm:my-1">
                    <span className="text-xl">{user?.name?.split(" ")[0]?.charAt(0)}</span>
                  </div>
                </div>
                <div>
                  <p className='font-bold line-clamp-1'>{user.name}</p>
                  <p className={`text-xs text-base-content/60 line-clamp-1 ${user.userYearLevel || user.userLicense ? 'mb-6' : ''}`}>{user.email}</p>
                  {(user.userYearLevel || user.userLicense) && (
                    <div className="absolute flex gap-1 max-sm:bottom-1.5 sm:bottom-2">
                      {user.userYearLevel && (
                        <span className="badge badge-sm bg-primary/80 text-primary-content badge-ghost text-[10px] uppercase">
                          Year {user.userYearLevel}
                        </span>
                      )}
                      {user.userLicense && (
                        <span className="badge badge-sm bg-primary/80 text-primary-content badge-ghost text-[10px] uppercase">
                          {user.userLicense}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className='flex items-center gap-2'>
                  <div className='flex items-center gap-1 text-base-content/60'>
                    <Calendar className='size-3 text-primary' />
                    <p className='text-xs max-sm:pr-4'>{new Date(user._creationTime).toLocaleDateString()}</p>
                  </div>
                  <ChevronRight className='max-sm:hidden size-4 opacity-0 text-primary group-hover:opacity-100 group-hover:-translate-x-1 transition-all' />
                </div>
              </li>
            ))}
          </div>
          </>
          )}
        </div>
      </div>
      {type ? (
        <OverlayModal mainText={vehicleSelected?.carPlate} primaryText={matchedUser?.name} secondaryText={matchedUser?.userLicense} creationTime={vehicleSelected?._creationTime} matched={matchedUser} image={matchedUser?.image}  />
      ) : (
        <OverlayModal mainText={userSelected?.name} primaryText={matchedVehicle?.carPlate} secondaryText={matchedVehicle?.carModel} creationTime={userSelected?._creationTime} matched={matchedVehicle} image='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLWNhci1mcm9udC1pY29uIGx1Y2lkZS1jYXItZnJvbnQiPjxwYXRoIGQ9Im0yMSA4LTIgMi0xLjUtMy43QTIgMiAwIDAgMCAxNS42NDYgNUg4LjRhMiAyIDAgMCAwLTEuOTAzIDEuMjU3TDUgMTAgMyA4Ii8+PHBhdGggZD0iTTcgMTRoLjAxIi8+PHBhdGggZD0iTTE3IDE0aC4wMSIvPjxyZWN0IHdpZHRoPSIxOCIgaGVpZ2h0PSI4IiB4PSIzIiBbyPSIxMCIgcng9IjIiLz48cGF0aCBkPSJNNSAxOHYyIi8+PHBhdGggZD0iTTE5IDE4djIiLz48L3N2Zz4='  />
      )}
    </div>
  );
}
