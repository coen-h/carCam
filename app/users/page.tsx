'use client';

import { useState, useMemo } from 'react';
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Filter, X } from "lucide-react";
import Header from "@/app/components/Header";

export default function Users() {
  const users = useQuery(api.function.getAllUsers);
  const [input, setInput] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedLicense, setSelectedLicense] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const newUser = useMemo(() => {
    if (!users) return [];
    let filteredUsers = users;

    const query = input.trim().toLowerCase();
    
    if (query) {
      filteredUsers = users.filter((user) =>
        user.name.toLowerCase().includes(query)
      );
    }

    if (selectedYear) {
      filteredUsers = filteredUsers.filter((user) => user.year === selectedYear);
    }

    if (selectedLicense) {
      filteredUsers = filteredUsers.filter((user) => user.license === selectedLicense);
    }

    return filteredUsers;
  }, [users, input, selectedYear, selectedLicense]);

  return (
    <div className='w-screen h-screen bg-base-100'>
      <Header />
      <div className="container mx-auto p-2 w-lg bg-base-200 rounded-box m-4">
        <div className='list text-base-content gap-0.5'>
          <p className='p-2 text-lg opacity-60 tracking-wide'>Students</p>
          <div className='flex gap-1'>
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Search..." className='input mb-2 w-full flex-1'></input>
            <button className={`swap swap-rotate btn bg-base-100 ${isDropdownOpen ? 'swap-active' : ''}`} popoverTarget="popover-1" style={{ anchorName: "--anchor-1" }}>
              <input type="checkbox" />
              <Filter className='swap-off size-5' />
              <X className='swap-on size-5' />
            </button>
            <ul onToggle={(e) => setIsDropdownOpen(e.newState === 'open')} className="dropdown menu w-52 rounded-box bg-base-100 shadow-sm" popover="auto" id="popover-1" style={{ positionAnchor: "--anchor-1" }}>
              <li>
                <select onChange={(e) => setSelectedYear(e.target.value)} className='select w-full select-ghost'>
                  <option value=''>All Years</option>
                  <option value='11'>Year 11</option>
                  <option value='12'>Year 12</option>
                  <option value='13'>Year 13</option>
                </select>
              </li>
              <li>
                <select onChange={(e) => setSelectedLicense(e.target.value)} className='select w-full select-ghost'>
                  <option value=''>All Licenses</option>
                  <option value='learners'>Learners</option>
                  <option value='restricted'>Restricted</option>
                  <option value='full'>Full</option>
                </select>
              </li>
            </ul>
          </div>
          {newUser.map((user) => (
            <li className='list-row bg-base-300 relative' key={user.id}>
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
  );
}
