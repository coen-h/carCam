'use client';

import { useState, useMemo } from 'react';
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Filter, X, User} from "lucide-react";
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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isdark, setIsdarkCom] = useState<boolean | null>(null);
  const [selected, setSelected] = useState(null as SelectedProps | null);
  
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
    <div className='w-screen h-screen bg-base-100'>
      <Background />
      <Header setIsDarkCom={setIsdarkCom} />
      <div className="container mx-auto p-2 w-lg bg-base-200 m-4 rounded-box">
        <div className='list text-base-content gap-0.5'>
          <p className='p-2 text-lg opacity-60 tracking-wide'>Students</p>
          <div className='flex gap-1'>
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Search..." className='input mb-2 w-full flex-1'></input>
            <button className={`swap swap-rotate btn bg-base-100 ${isDropdownOpen ? 'swap-active' : ''}`} popoverTarget="popover-1" style={{ anchorName: "--anchor-1" }}>
              <input type="checkbox" />
              <Filter className='swap-off size-5' />
              <X className='swap-on size-5' />
            </button>
            <ul onToggle={(e) => setIsDropdownOpen(e.newState === 'open')} className="dropdown menu w-52 bg-base-100 shadow-sm rounded-box mt-1" popover="auto" id="popover-1" style={{ positionAnchor: "--anchor-1" }}>
              <li>
                <select onChange={(e) => setSelectedYear(e.target.value)} className='select border-0 w-full'>
                  <option value=''>All Years</option>
                  <option value='11'>Year 11</option>
                  <option value='12'>Year 12</option>
                  <option value='13'>Year 13</option>
                </select>
              </li>
              <li>
                <select onChange={(e) => setSelectedLicense(e.target.value)} className='select border-0 w-full'>
                  <option value=''>All Licenses</option>
                  <option value='learners'>Learners</option>
                  <option value='restricted'>Restricted</option>
                  <option value='full'>Full</option>
                </select>
              </li>
            </ul>
          </div>
          <div className='flex flex-col gap-1 h-min max-h-120 overflow-scroll'>
            {newUser.map((user) => (
              <li className='list-row bg-base-300 relative cursor-pointer hover:bg-base-200 transition' key={user._id} onClick={() => { (document.getElementById('my_modal_1') as HTMLDialogElement).showModal(); setSelected(user)}}>
                <img src={user.image} className="rounded w-10 h-10" />
                <div>
                  <p>{user.name}</p>
                  <p className='text-xs font-light text-base-content/70'>{user.email}</p>
                </div>
                <p className='absolute -top-3 right-1 bg-base-100 border-base-100 p-1 rounded-box'>{new Date(user._creationTime).toLocaleString()}</p>
              </li>
            ))}
          </div>
        </div>
      </div>
      <OverlayModal mainText={selected?.name} primaryText={matchedUser?.carPlate} secondaryText={matchedUser?.carModel} creationTime={selected?._creationTime} matched={matchedUser} image='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLWNhci1mcm9udC1pY29uIGx1Y2lkZS1jYXItZnJvbnQiPjxwYXRoIGQ9Im0yMSA4LTIgMi0xLjUtMy43QTIgMiAwIDAgMCAxNS42NDYgNUg4LjRhMiAyIDAgMCAwLTEuOTAzIDEuMjU3TDUgMTAgMyA4Ii8+PHBhdGggZD0iTTcgMTRoLjAxIi8+PHBhdGggZD0iTTE3IDE0aC4wMSIvPjxyZWN0IHdpZHRoPSIxOCIgaGVpZ2h0PSI4IiB4PSIzIiB5PSIxMCIgcng9IjIiLz48cGF0aCBkPSJNNSAxOHYyIi8+PHBhdGggZD0iTTE5IDE4djIiLz48L3N2Zz4='  />
    </div>
  );
}
