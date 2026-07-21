'use client';

import Header from "@/app/components/Header";
import Background from "@/app/components/Background";
import { useState, useEffect } from 'react';
import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import carList from "@/public/carData.json";

export default function Login() {
  const user = useQuery(api.function.getUser);
  const router = useRouter();
  const updateUser = useMutation(api.function.updateUser);
  const [, setIsdarkCom] = useState<boolean | null>(null);
  const [formData, setFormData] = useState({
    userYearLevel: '13',
    userLicense: 'Learners',
    role: 'student',
    carPlate: '',
    carMake: '',
    carModel: '',
    carYear: '',
    customMake: '',
    customModel: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      
      if (name === 'carMake') {
        updated.carModel = '';
        updated.customModel = '';
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const finalMake = formData.carMake === 'Other' ? formData.customMake : formData.carMake;
    const finalModel = formData.carModel === 'Other' ? formData.customModel : formData.carModel;
    const combinedCarModel = `${finalMake} ${finalModel}`.trim();

    await updateUser({
      userLicense: formData.userLicense,
      userYearLevel: formData.userYearLevel,
      carPlate: formData.carPlate.toUpperCase(),
      carModel: combinedCarModel,
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

  const brandsData = (carList?.brands || {}) as Record<string, string[]>;
  const availableModels = formData.carMake && formData.carMake !== 'Other' 
    ? brandsData[formData.carMake] || [] 
    : [];

  return (
    <div className='w-screen min-h-screen bg-base-100'>
      <Background />
      <Header setIsDarkCom={setIsdarkCom} />
      <main className='absolute top-0 h-screen w-screen flex items-center justify-center px-2'>
        <div className="card bg-base-200 border-base-300 w-full max-w-lg border shadow-2xl p-4 rounded-box text-base-content">
          <form onSubmit={handleSubmit} className="card-body p-0 gap-4">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label font-semibold">Student Year Level</label>
                <select name="userYearLevel" required className="input focus:outline-primary select cursor-pointer" value={formData.userYearLevel} onChange={handleChange}>
                  <option value="11">11</option>
                  <option value="12">12</option>
                  <option value="13">13</option>
                </select>
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
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label font-semibold">Car Make</label>
                <select name="carMake" required className="input focus:outline-primary select cursor-pointer w-full" value={formData.carMake} onChange={handleChange}>
                  <option value="">Select Make</option>
                  {Object.keys(brandsData).map((brandName) => (
                    <option key={brandName} value={brandName}>
                      {brandName}
                    </option>
                  ))}
                  <option value="Other">Other (Not listed)</option>
                </select>
              </div>

              <div>
                <label className="label font-semibold">Car Model</label>
                <select name="carModel" required disabled={!formData.carMake} className="input focus:outline-primary select cursor-pointer w-full disabled:border-base-content/10 disabled:cursor-not-allowed" value={formData.carModel} onChange={handleChange}>
                  <option value="">Select Model</option>
                  {availableModels.map((modelName) => (
                    <option key={modelName} value={modelName}>
                      {modelName}
                    </option>
                  ))}
                  {formData.carMake && <option value="Other">Other (Not listed)</option>}
                </select>
              </div>
            </div>

            {formData.carMake === 'Other' && (
              <div className="flex flex-col">
                <label className="label font-semibold">Specify Car Make</label>
                <input name='customMake' type="text" required className="input focus:outline-primary w-full" placeholder="e.g. Rivian" value={formData.customMake} onChange={handleChange} />
              </div>
            )}

            {(formData.carModel === 'Other' || formData.carMake === 'Other') && (
              <div className="flex flex-col">
                <label className="label font-semibold">Specify Car Model</label>
                <input name='customModel' type="text" required className="input focus:outline-primary w-full" placeholder="e.g. R1T" value={formData.customModel} onChange={handleChange} />
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col">
                <label className="label font-semibold">License Plate</label>
                <input name='carPlate' type="text" maxLength={6} required className="input uppercase focus:outline-primary w-full" placeholder="ABC123" value={formData.carPlate} onChange={handleChange} />
              </div>
              {/* <div>
                <label className="label font-semibold">Make and Model</label>
                <select name="carModel" required className="input focus:outline-primary select cursor-pointer" value={formData.carModel} onChange={handleChange}>
                  {Object.keys(carList.brands).map((brandName) => (
                    <option key={brandName} value={brandName}>
                      {brandName}
                    </option>
                  ))}
                </select>
              </div> */}
              <div>
                <label className="label font-semibold">Year</label>
                <input name='carYear' type="text" maxLength={4} required className="input focus:outline-primary" placeholder="2021" value={formData.carYear} onChange={handleChange} />
              </div>
            </div>
            
            <button className="btn btn-primary mt-2" type="submit">Login</button>
          </form>
        </div>
      </main>
    </div>
  );
}