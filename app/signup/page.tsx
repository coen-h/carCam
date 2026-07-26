'use client';

import { GraduationCap, CarFront, Check, ShieldCheck } from "lucide-react";
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
      <div className="w-full h-full flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  const brandsData = (carList?.brands || {}) as Record<string, string[]>;
  const availableModels = formData.carMake && formData.carMake !== 'Other' 
    ? brandsData[formData.carMake] || [] 
    : [];

  return (
    <>
      <main className='absolute top-0 h-screen w-screen gap-8 flex items-center justify-center px-2'>
        <div className="w-sm max-lg:hidden flex flex-col gap-4 text-base-content">
          <div className="flex flex-col gap-1">
            <p className="font-bold text-4xl tracking-tighter">Register your vehicle</p>
            <p className="text-base-content/60">This lets the school recognise your car and gives you access to your own parking history.</p>
          </div>
          <div className="flex flex-col gap-4 mt-2">
            <div className="flex items-center gap-3 font-bold">
              <p className="bg-info size-8 text-neutral flex items-center justify-center rounded-full font-bold">1</p>
              <p>Driver Details</p>
            </div>
            <div className="flex items-center gap-3 font-bold">
              <p className="bg-info/10 size-8 text-info flex items-center justify-center rounded-full font-bold">2</p>
              <p>Vehicle Details</p>
            </div>
            <div className="flex items-center gap-3 font-bold text-base-content/60">
              <p className="bg-transparent border-base-content/20 border size-8 flex items-center justify-center rounded-full font-bold">3</p>
              <p>Ready to use</p>
            </div>
          </div>
          <div className="w-full flex gap-2 bg-success/10 p-2 rounded-box mt-4">
            <ShieldCheck className="text-success size-5"/>
            <p className="text-sm text-base-content/80">Your registration is only visible to you and authorised school staff.</p>
          </div>
        </div>
        <div className="card bg-base-200 border-base-300 w-full max-w-lg border shadow-2xl p-4 rounded-box text-base-content">
          <form onSubmit={handleSubmit} className="card-body p-0 gap-4">
            <div className="flex gap-2">
              <div className="bg-info/10 size-10 p-2 rounded-box">
                <GraduationCap className="text-info"/>
              </div>
              <div>
                <p className="font-semibold text-xl">About you</p>
                <p className="text-base-content/60 text-sm">Your current school year and driver license stage.</p>
              </div>
            </div>
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
            <div className="flex gap-2 mt-6">
              <div className="bg-success/10 size-10 p-2 rounded-box">
                <CarFront className="text-success"/>
              </div>
              <div>
                <p className="font-semibold text-xl">Your vehicle</p>
                <p className="text-base-content/60 text-sm">Enter the details shown on your vehicle registration.</p>
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
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Check className="size-4 text-success"/>
                <p className="text-base-content/60 text-sm">You can update these details later.</p>
              </div>
              <button className="btn btn-primary mt-2 px-12" type="submit">Login</button>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}