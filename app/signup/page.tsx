'use client';

import Header from "@/app/components/Header";
import Background from "@/app/components/Background";
import { useState, useEffect } from 'react';
import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";

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
      carPlate: formData.carPlate.toUpperCase(),
      carModel: formData.carModel,
      carYear: formData.carYear,
      role: formData.role,
    });

    router.push("/dashboard");
  };

  useEffect(() => {
    if (user?.carPlate) {
      router.push('/dashboard');
    }
  }, [user, router]);

  if (user === undefined || user?.carPlate) {
    return (
      <div className="w-screen min-h-screen flex items-center justify-center bg-base-100">
        <Background />
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className='w-screen min-h-screen bg-base-100'>
      <Background />
      <Header setIsDarkCom={setIsdarkCom} />
      <div className='absolute top-0 h-screen w-screen flex items-center justify-center px-2'>
        <div className="card bg-base-200 border-base-300 w-full max-w-lg border shadow-2xl p-4 rounded-box text-base-content">
          <div className="card-body p-0 gap-4">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-base-content">Complete Your Profile</h2>
              <p className="text-sm text-base-content/70 mt-1">Please provide your driver and vehicle details.</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label font-semibold">Student Year Level</label>
                <input name='userYearLevel' maxLength={2} required type="text" className="input focus:outline-primary" placeholder="13" value={formData.userYearLevel} onChange={handleChange} />
              </div>
              <div>
                <label className="label font-semibold">License</label>
                <select name="userLicense" required className="input focus:outline-primary select cursor-pointer" value={formData.userLicense} onChange={handleChange}>
                  <option value="Learners">Learners</option>
                  <option value="Restricted">Restricted</option>
                  <option value="Full">Full</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col">
              <label className="label font-semibold">License Plate</label>
              <input name='carPlate' type="text" maxLength={6} required className="input uppercase focus:outline-primary w-full" placeholder="ABC123" value={formData.carPlate} onChange={handleChange} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label font-semibold">Make and Model</label>
                <input name='carModel' type="text" required className="input focus:outline-primary" placeholder="Toyota Prius" value={formData.carModel} onChange={handleChange} />
              </div>
              <div>
                <label className="label font-semibold">Year</label>
                <input name='carYear' type="text" maxLength={4} required className="input focus:outline-primary" placeholder="2021" value={formData.carYear} onChange={handleChange} />
              </div>
            </div>
            
            <button className="btn btn-primary mt-2" onClick={handleSubmit}>Login</button>
          </div>
        </div>
      </div>
    </div>
  );
}