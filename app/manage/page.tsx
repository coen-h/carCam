'use client';

import { useState, useEffect } from 'react';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import {
  addPlate,
  removePlate,
  getAllPlates,
  uploadPlatesCsv,
} from '@/app/lib/manageActions';

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
  const handleAddInputChange = (e) => {
    const { name, value } = e.target;
    setNewPlateData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  // Handle adding a new plate
  const handleAddPlate = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setMessage('');
      // Basic validation
      if (
        !newPlateData.name ||
        !newPlateData.plate_number ||
        isNaN(parseInt(newPlateData.car_year))
      ) {
        setError('Please fill all fields correctly for adding a plate.');
        return;
      }

      await addPlate({
        ...newPlateData,
        car_year: parseInt(newPlateData.car_year), // Ensure year is integer
      });
      setMessage('Plate added successfully!');
      setNewPlateData({
        // Reset form
        name: '',
        licence_class: '',
        car_make: '',
        car_model: '',
        car_year: '',
        plate_number: '',
      });
      fetchPlates(); // Refresh the list
    } catch (err) {
      console.error('Failed to add plate:', err);
      setError(`Failed to add plate: ${err.message}`);
    }
  };

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
      <h1 className="text-4xl font-bold text-gray-800 mb-8 text-center">
        Plate Management System
      </h1>

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

      {/* Add New Plate */}
      <section className={sectionClasses}>
        <h2 className="text-2xl font-semibold text-gray-700 mb-6">
          Add New Plate
        </h2>
        <form
          onSubmit={handleAddPlate}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl mx-auto"
        >
          <div>
            <label
              htmlFor="name"
              className="block text-gray-700 text-sm font-bold mb-2"
            >
              Name:
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={newPlateData.name}
              onChange={handleAddInputChange}
              className={inputClasses}
              required
            />
          </div>
          <div>
            <label
              htmlFor="licence_class"
              className="block text-gray-700 text-sm font-bold mb-2"
            >
              License Class:
            </label>
            <input
              type="text"
              id="licence_class"
              name="licence_class"
              value={newPlateData.licence_class}
              onChange={handleAddInputChange}
              className={inputClasses}
            />
          </div>
          <div>
            <label
              htmlFor="car_make"
              className="block text-gray-700 text-sm font-bold mb-2"
            >
              Car Make:
            </label>
            <input
              type="text"
              id="car_make"
              name="car_make"
              value={newPlateData.car_make}
              onChange={handleAddInputChange}
              className={inputClasses}
            />
          </div>
          <div>
            <label
              htmlFor="car_model"
              className="block text-gray-700 text-sm font-bold mb-2"
            >
              Car Model:
            </label>
            <input
              type="text"
              id="car_model"
              name="car_model"
              value={newPlateData.car_model}
              onChange={handleAddInputChange}
              className={inputClasses}
            />
          </div>
          <div>
            <label
              htmlFor="car_year"
              className="block text-gray-700 text-sm font-bold mb-2"
            >
              Car Year:
            </label>
            <input
              type="number"
              id="car_year"
              name="car_year"
              value={newPlateData.car_year}
              onChange={handleAddInputChange}
              className={inputClasses}
              required
            />
          </div>
          <div>
            <label
              htmlFor="plate_number"
              className="block text-gray-700 text-sm font-bold mb-2"
            >
              Plate Number:
            </label>
            <input
              type="text"
              id="plate_number"
              name="plate_number"
              value={newPlateData.plate_number}
              onChange={handleAddInputChange}
              className={inputClasses}
              required
            />
          </div>
          <div className="md:col-span-2 flex justify-center">
            <button type="submit" className={buttonPrimaryClasses}>
              Add Plate
            </button>
          </div>
        </form>
      </section>

      {/* Remove Plate */}
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

      {/* Upload Plates CSV */}
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

      {/* All Plates List */}
      <section className={sectionClasses}>
        <h2 className="text-2xl font-semibold text-gray-700 mb-6">
          All Plates
        </h2>
        {plates.length === 0 ? (
          <p className="text-gray-600">No plates found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    License Class
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Make
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Model
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Year
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plate Number
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {plates.map((plate) => (
                  <tr key={plate.plate_number} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {plate.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {plate.licence_class}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {plate.car_make}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {plate.car_model}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {plate.car_year}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {plate.plate_number}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
    <Footer />
    </>
  );
}