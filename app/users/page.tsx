'use client';

import { useState, useMemo } from 'react';
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Filter, X, User, Calendar, ChevronRight } from "lucide-react";
import OverlayModal from "@/app/components/OverlayModal";
import Header from "@/app/components/Header";
import Background from "@/app/components/Background";

interface SelectedProps {
  name?: string;
  carPlate?: string;
  _creationTime: number;
  totalEntries?: string;
  carModel?: string;
  carYear?: string;
}

export default function Users() {
  const users = useQuery(api.function.getAllUsers);
  const [input, setInput] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedLicense, setSelectedLicense] = useState('');
  const [isdark, setIsdarkCom] = useState<boolean | null>(null);
  const [selected, setSelected] = useState(null as SelectedProps | null);
  const isLoading = users === undefined;
  
  const matchedUser = useQuery(
    api.function.getVehicleFromPlate, 
    selected?.carPlate ? { carPlate: selected.carPlate } : "skip"
  );

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

  return (
    <div className='w-full h-dvh flex flex-col bg-base-100 overflow-hidden'>
      <Background />
      <Header setIsDarkCom={setIsdarkCom} />
      <div className="container mx-auto max-w-2xl max-md:max-w-3xl w-full p-2 flex-1 max-md:flex max-md:flex-col min-h-0">
        <div className='list max-md:mb-14 flex-1 min-h-0 backdrop-blur-md text-base-content gap-0.5 bg-base-200 shadow-2xl border border-base-200 rounded-box p-4'>
          <div className="shrink-0">
            <p className='text-2xl font-semibold tracking-tight'>Students</p>
            <p className='text-sm text-base-content/60 line-clamp-1'>Manage and track student profiles and linked vehicles</p>
          </div>
          <div className='sm:flex max-sm:grid max-sm:grid-cols-2 max-sm:gap-2 gap-1 mt-4'>
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Search..." className='max-sm:order-3 col-span-2 input mb-2 w-full flex-1 focus:outline-primary' />
            <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="max-sm:order-1 select bg-base-100 focus:outline-none w-32 max-sm:w-full">
              <option value=''>All Years</option>
              <option value='11'>Year 11</option>
              <option value='12'>Year 12</option>
              <option value='13'>Year 13</option>
            </select>
            <select value={selectedLicense} onChange={(e) => setSelectedLicense(e.target.value)} className="max-sm:order-2 select bg-base-100 focus:outline-none w-32 max-sm:w-full">
              <option value=''>All Licenses</option>
              <option value='learners'>Learners</option>
              <option value='restricted'>Restricted</option>
              <option value='full'>Full</option>
            </select>
          </div>
          <div className='flex flex-col gap-1 md:h-120 h-full overflow-y-scroll'>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <span className="loading loading-spinner loading-lg text-primary"></span>
                <p className="text-base-content/60 text-sm">Loading...</p>
              </div>
            ) : newUser.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <p className="text-base-content/60 text-sm">No students found.</p>
              </div>
            ) : newUser.map((user) => (
              <li className='list-row p-1 items-center bg-base-100 relative cursor-pointer group transition border border-base-300 hover:border-primary/40' key={user._id} onClick={() => { (document.getElementById('my_modal_1') as HTMLDialogElement).showModal(); setSelected(user)}}>
                <img src={user.image} className="rounded-lg size-12 ml-3 max-sm:ml-1 my-3 max-sm:my-1" />
                <div>
                  <p className='font-bold line-clamp-1'>{user.name}</p>
                  <p className={`text-xs text-base-content/60 line-clamp-1 ${user.userYearLevel || user.userLicense ? 'mb-6' : ''}`}>{user.email}</p>
                  {(user.userYearLevel || user.userLicense) && (
                    <div className="absolute flex gap-1 max-sm:bottom-1.5 sm:bottom-2">
                      {user.userYearLevel && (
                        <span className="badge badge-sm badge-ghost text-[10px] uppercase">
                          Year {user.userYearLevel}
                        </span>
                      )}
                      {user.userLicense && (
                        <span className="badge badge-sm badge-ghost text-[10px] uppercase">
                          {user.userLicense}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className='flex items-center gap-2'>
                  <div className='flex items-center gap-1 text-base-content/60'>
                    <Calendar className='size-3' />
                    <p className='text-xs max-sm:pr-4'>{new Date(user._creationTime).toLocaleDateString()}</p>
                  </div>
                  <ChevronRight className='max-sm:hidden size-4 opacity-0 text-primary group-hover:opacity-100 group-hover:-translate-x-1 transition-transform' />
                </div>
              </li>
            ))}
          </div>
        </div>
      </div>
      <OverlayModal mainText={selected?.name} primaryText={matchedUser?.carPlate} secondaryText={matchedUser?.carModel} creationTime={selected?._creationTime} matched={matchedUser} image='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLWNhci1mcm9udC1pY29uIGx1Y2lkZS1jYXItZnJvbnQiPjxwYXRoIGQ9Im0yMSA4LTIgMi0xLjUtMy43QTIgMiAwIDAgMCAxNS42NDYgNUg4LjRhMiAyIDAgMCAwLTEuOTAzIDEuMjU3TDUgMTAgMyA4Ii8+PHBhdGggZD0iTTcgMTRoLjAxIi8+PHBhdGggZD0iTTE3IDE0aC4wMSIvPjxyZWN0IHdpZHRoPSIxOCIgaGVpZ2h0PSI4IiB4PSIzIiB5PSIxMCIgcng9IjIiLz48cGF0aCBkPSJNNSAxOHYyIi8+PHBhdGggZD0iTTE5IDE4djIiLz48L3N2Zz4='  />
    </div>
  );
}
