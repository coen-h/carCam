'use client';

import Header from "@/app/components/Header";
import Background from "@/app/components/Background";
import { useState } from 'react';
import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { redirect } from "next/navigation";

export default function Login() {
  const user = useQuery(api.function.getUser);
  const router = useRouter();
  const updateUser = useMutation(api.function.updateUser);
  const [isdark, setIsdarkCom] = useState<boolean | null>(null);
  const [formData, setFormData] = useState({
    userYearLevel: '',
    userLicense: 'Learners',
    role: 'student',
    carPlate: '',
    carModel: '',
    carYear: '',
  });

  const handleChange = ( e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement> ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async () => {
    await updateUser({
      userLicense: formData.userLicense,
      userYearLevel: formData.userYearLevel,
      carPlate: formData.carPlate,
      carModel: formData.carModel,
      carYear: formData.carYear,
    });

    router.push("/dashboard");
  };

  if (user === undefined) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-base-100">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  // 2. Redirect ONLY if they already have a car plate (Assuming this is an onboarding page)
  if (user?.carPlate) {
    redirect('/dashboard');
  }

  return (
    <div className='w-screen h-screen bg-base-100'>
      <Background />
      <Header setIsDarkCom={setIsdarkCom} />
      <div className='absolute top-0 h-screen w-screen flex items-center justify-center'>
        <div className="fieldset bg-base-200 border-base-300 w-xs border p-4 rounded-box">
            <legend className="fieldset-legend text-xl">Sign Up</legend>

            <label className="label">Student Year Level</label>
            <input name='userYearLevel' type="text" className="input" placeholder="13" value={formData.userYearLevel} onChange={handleChange} />

            <label className="label">
              License
            </label>
            <select name="userLicense" className="input select" value={formData.userLicense} onChange={handleChange}>
              <option value="Learners">Learners</option>
              <option value="Restricted">Restricted</option>
              <option value="Full">Full</option>
            </select>

            <label className="label">License Plate</label>
            <input name='carPlate' type="text" className="input" placeholder="ABC123" value={formData.carPlate} onChange={handleChange} />

            <label className="label">Make and Model</label>
            <input name='carModel' type="text" className="input" placeholder="Toyota Prius" value={formData.carModel} onChange={handleChange} />

            <label className="label">Year</label>
            <input name='carYear' type="text" className="input" placeholder="2021" value={formData.carYear} onChange={handleChange} />

            
            <button className="btn btn-neutral mt-2" onClick={handleSubmit}>Login</button>
        </div>
      </div>
    </div>
  );
}