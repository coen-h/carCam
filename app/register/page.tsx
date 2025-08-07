"use client";
import { useEffect, useState, useTransition } from "react";
import { addPlate } from "@/app/lib/manageActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Car, User, FileText, Calendar } from "lucide-react";

export default function Register() {
  const [isPending, startTransition] = useTransition();
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    licence_class: "",
    car_make: "",
    car_model: "",
    car_year: "",
    plate_number: "",
    notes: ""
  });

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 50 }, (_, i) => currentYear - i);

  const licenceClasses = [
    "Class 1 - Full",
    "Class 2 - Restricted", 
    "Class 3 - Learner",
    "Class 4 - Heavy Vehicle",
    "Class 5 - Motorcycle",
    "International"
  ];

  function handleInputChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  function handleSelectChange(name, value) {
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    // Basic validation
    const requiredFields = ['name', 'licence_class', 'car_make', 'car_model', 'car_year', 'plate_number'];
    const missingFields = requiredFields.filter(field => !formData[field]);
    
    if (missingFields.length > 0) {
      alert(`Please fill in the following required fields: ${missingFields.join(', ')}`);
      return;
    }

    startTransition(async () => {
      try {
        await addPlate(formData);
        setSubmitSuccess(true);
        
        // Reset form after successful submission
        setTimeout(() => {
          setFormData({
            name: "",
            licence_class: "",
            car_make: "",
            car_model: "",
            car_year: "",
            plate_number: "",
            notes: ""
          });
          setSubmitSuccess(false);
        }, 3000);
        
      } catch (error) {
        alert("Failed to register car. Please try again.");
        console.error(error);
      }
    });
  }

  if (submitSuccess) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="text-center">
                <CheckCircle2 className="mx-auto h-16 w-16 text-green-600 mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
                <p className="text-gray-600">
                  Your car has been successfully registered. You will be redirected shortly.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-2">
                <Car className="h-8 w-8 text-neutral-600" />
                Vehicle Registration
              </CardTitle>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Information Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <User className="h-5 w-5 text-neutral-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Enter your full name"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="licence_class">Licence Class</Label>
                      <Select value={formData.licence_class} onValueChange={(value) => handleSelectChange('licence_class', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select licence class" />
                        </SelectTrigger>
                        <SelectContent>
                          {licenceClasses.map((licence) => (
                            <SelectItem key={licence} value={licence}>
                              {licence}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  
                </div>

                {/* Vehicle Information Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <Car className="h-5 w-5 text-neutral-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Vehicle Information</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="car_make">Car Make</Label>
                      <Input id="car_make" name="car_make" type="text" value={formData.car_make} onChange={handleInputChange} placeholder="e.g., Toyota" />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="car_model">Car Model</Label>
                      <Input
                        id="car_model"
                        name="car_model"
                        type="text"
                        value={formData.car_model}
                        onChange={handleInputChange}
                        placeholder="e.g., Corolla, Civic, Focus"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="car_year">Car Year</Label>
                      <Select value={formData.car_year} onValueChange={(value) => handleSelectChange('car_year', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                        <SelectContent>
                          {years.map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="plate_number">Plate Number *</Label>
                      <Input
                        id="plate_number"
                        name="plate_number"
                        type="text"
                        value={formData.plate_number}
                        onChange={handleInputChange}
                        placeholder="e.g., ABC123"
                        style={{ textTransform: 'uppercase' }}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Notes Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <FileText className="h-5 w-5 text-neutral-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Additional Information</h3>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      placeholder="Any additional information or special requirements..."
                      rows={3}
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-6">
                  <Button
                    type="submit"
                    disabled={isPending}
                    className="w-full h-12 text-lg font-semibold bg-neutral-600 hover:bg-neutral-700 focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2"
                  >
                    {isPending ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        Registering...
                      </div>
                    ) : (
                      "Register Vehicle"
                    )}
                  </Button>
                </div>

              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}