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

            <label className="label">License Plate</label>
            <input type="text" className="input" placeholder="ABC123" />

            <label className="label">Make and Model</label>
            <input type="text" className="input" placeholder="Toyota Prius" />

            <label className="label">Year</label>
            <input type="text" className="input" placeholder="2021" />

            <label className="label">License</label>
            <details className="dropdown">
            <summary className="input">Learners</summary>
              <ul className="menu dropdown-content bg-base-100 rounded-box z-1 w-52 p-2 shadow-sm">
                <li><a>Item 1</a></li>
                <li><a>Item 2</a></li>
              </ul>
            </details>
            <button className="btn btn-neutral mt-4">Login</button>
        </div>
      </div>
    </div>
  );
}