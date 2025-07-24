'use client';

import { useState, useEffect, useTransition } from 'react';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import {
  addPlate,
  removePlate,
  getAllPlates,
  uploadPlatesCsv,
} from '@/app/lib/manageActions';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function HomePage() {
  const [plates, setPlates] = useState([]);
  const [newPlateData, setNewPlateData] = useState({
    name: '',
    licence_class: '',
    car_make: '',
    car_model: '',
    car_year: '',
    plate_number: '',
  });
  const [plateToRemove, setPlateToRemove] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [newCar, setNewCar] = useState({
    name: '',
    licence_class: '',
    car_make: '',
    car_model: '',
    car_year: '',
    plate_number: '',
  });

  // Function to fetch all plates
  const fetchPlates = async () => {
    try {
      setError('');
      const fetchedPlates = await getAllPlates();
      setPlates(fetchedPlates);
    } catch (err) {
      console.error('Failed to fetch plates:', err);
      setError('Failed to fetch plates.');
    }
  };

  useEffect(() => {
    fetchPlates();
  }, []); // Fetch plates on initial load

  // Handle input changes for adding a plate
  function handleInputChange(e) {
    const { name, value } = e.target;
    setNewCar((prev) => ({ ...prev, [name]: value }));
  }

  async function handleAddCar() {
    if (
      !newCar.name ||
      !newCar.licence_class ||
      !newCar.car_make ||
      !newCar.car_model ||
      !newCar.car_year ||
      !newCar.plate_number
    ) {
      alert('Please fill in all fields');
      return;
    }

    startTransition(async () => {
      try {
        await addPlate({
          ...newCar
        });

        setNewCar({
          name: '',
          licence_class: '',
          car_make: '',
          car_model: '',
          car_year: '',
          plate_number: '',
        });
        setDialogOpen(false);
      } catch (error) {
        alert('Failed to add car. Please try again.');
        console.error(error);
      }
    });
  }

  // Handle removing a plate
  const handleRemovePlate = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setMessage('');
      if (!plateToRemove) {
        setError('Please enter a plate number to remove.');
        return;
      }
      await removePlate(plateToRemove);
      setMessage(`Plate "${plateToRemove}" removed successfully!`);
      setPlateToRemove(''); // Clear input
      fetchPlates(); // Refresh the list
    } catch (err) {
      console.error('Failed to remove plate:', err);
      setError(`Failed to remove plate: ${err.message}`);
    }
  };

  // Handle file change for CSV upload
  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setMessage('');
    setError('');
  };

  // Handle CSV upload submission
  const handleUploadCsv = async (event) => {
    event.preventDefault();
    try {
      setError('');
      setMessage('');
      if (!selectedFile) {
        setError('Please select a CSV file to upload.');
        return;
      }

      const result = await uploadPlatesCsv(selectedFile);
      setMessage(
        `Successfully uploaded ${result.count} plates from the CSV.`
      );
      setSelectedFile(null); // Clear the input
      event.target.reset(); // Reset the file input visually
      fetchPlates(); // Refresh the list
    } catch (err) {
      console.error('Upload failed:', err);
      setError(`CSV Upload failed: ${err.message}`);
    }
  };

  const inputClasses =
    'p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full';
  const buttonPrimaryClasses =
    'px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  const buttonDangerClasses =
    'px-5 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  const buttonSuccessClasses =
    'px-5 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  const sectionClasses =
    'mb-8 p-6 border border-gray-200 rounded-lg shadow-sm bg-white';
  const messageClasses = 'mt-4 p-3 rounded-md';

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-100 p-8">
        {message && (
          <p className={`${messageClasses} bg-green-100 text-green-700`}>
            {message}
          </p>
        )}
        {error && (
          <p className={`${messageClasses} bg-red-100 text-red-700`}>
            {error}
          </p>
        )}

        <section className={sectionClasses}>
          <h2 className="text-2xl font-semibold text-gray-700 mb-6">
            Add Plate
          </h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full my-2">Add New Car</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Car</DialogTitle>
                <DialogDescription>
                  Fill in the details below to add a new car entry.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <Input
                  placeholder="Name"
                  name="name"
                  value={newCar.name}
                  onChange={handleInputChange}
                />
                <Input
                  placeholder="Licence Class"
                  name="licence_class"
                  value={newCar.licence_class}
                  onChange={handleInputChange}
                />
                <Input
                  placeholder="Car Make"
                  name="car_make"
                  value={newCar.car_make}
                  onChange={handleInputChange}
                />
                <Input
                  placeholder="Car Model"
                  name="car_model"
                  value={newCar.car_model}
                  onChange={handleInputChange}
                />
                <Input
                  placeholder="Car Year"
                  name="car_year"
                  value={newCar.car_year}
                  onChange={handleInputChange}
                  type="number"
                />
                <Input
                  placeholder="Plate Number"
                  name="plate_number"
                  value={newCar.plate_number}
                  onChange={handleInputChange}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleAddCar}>
                  Add Car
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </section>

        <section className={sectionClasses}>
          <h2 className="text-2xl font-semibold text-gray-700 mb-6">
            Remove Plate
          </h2>
          <form onSubmit={handleRemovePlate} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <label htmlFor="remove_plate" className="flex-grow">
              <span className="block text-gray-700 text-sm font-bold mb-2">
                Plate Number:
              </span>
              <input
                type="text"
                id="remove_plate"
                value={plateToRemove}
                onChange={(e) => setPlateToRemove(e.target.value)}
                className={inputClasses}
                required
              />
            </label>
            <button type="submit" className={`mt-auto ${buttonDangerClasses}`}>
              Remove Plate
            </button>
          </form>
        </section>

        <section className={sectionClasses}>
          <h2 className="text-2xl font-semibold text-gray-700 mb-6">
            Upload Plates from CSV
          </h2>
          <form onSubmit={handleUploadCsv} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <label htmlFor="csv_file" className="flex-grow">
              <span className="block text-gray-700 text-sm font-bold mb-2">
                Select CSV File:
              </span>
              <input
                type="file"
                id="csv_file"
                accept=".csv"
                onChange={handleFileChange}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 block w-full text-sm text-gray-500"
              />
            </label>
            <button
              type="submit"
              disabled={!selectedFile}
              className={`mt-auto ${buttonSuccessClasses}`}
            >
              Upload CSV
            </button>
          </form>
        </section>
      </div>
      <Footer />
    </>
  );
}