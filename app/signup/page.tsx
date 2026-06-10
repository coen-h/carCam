'use client';

import Header from "@/app/components/Header";

export default function Login() {
  return (
    <div className='w-screen h-screen bg-base-100'>
      <Header />
      <div className='absolute top-0 h-screen w-screen flex items-center justify-center'>
        <div className="fieldset bg-base-200 border-base-300 rounded-box w-xs border p-4">
            <legend className="fieldset-legend text-xl">Sign Up</legend>

            <label className="label">Student Year Level</label>
            <input type="text" className="input" placeholder="13" />

            <label className="label">
              License
            </label>
            <select className="input">
              <option value="">Learners</option>
              <option value="item1">Restricted</option>
              <option value="item2">Full</option>
            </select>

            <label className="label">License Plate</label>
            <input type="text" className="input" placeholder="ABC123" />

            <label className="label">Make and Model</label>
            <input type="text" className="input" placeholder="Toyota Prius" />

            <label className="label">Year</label>
            <input type="text" className="input" placeholder="2021" />

            
            <button className="btn btn-neutral mt-2">Login</button>
        </div>
      </div>
    </div>
  );
}