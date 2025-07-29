"use client";
import Link from "next/link";
import { useEffect, useState, useMemo, useTransition } from "react";
import Footer from "@/app/components/Footer";
import Header from "@/app/components/Header";
import fetchSearch from "@/app/lib/fetchSearch";
import {
  addPlate,
  removePlate,
  uploadPlatesCsv,
} from "@/app/lib/manageActions";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Search() {
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPlates, setSelectedPlates] = useState(new Set());
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [newCar, setNewCar] = useState({
    name: "",
    licence_class: "",
    car_make: "",
    car_model: "",
    car_year: "",
    plate_number: "",
  });

  const filteredCars = useMemo(() => {
    if (!searchTerm) return data;
    return data.filter(
      (user) =>
        (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.licence_class && user.licence_class.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.car_make && user.car_make.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.plate_number && user.plate_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.car_model && user.car_model.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [searchTerm, data]);

  async function fetchData() {
    try {
      const info = await fetchSearch();
      setData(info);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  function handleInputChange(e) {
    const { name, value } = e.target;
    setNewCar((prev) => ({ ...prev, [name]: value }));
  }

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleUploadCsv = async (event) => {
    event.preventDefault();
    try {
      if (!selectedFile) {
        console.log("Please select a CSV file to upload.");
        return;
      }

      const result = await uploadPlatesCsv(selectedFile);
      console.log(`Successfully uploaded ${result.count} plates from the CSV.`);
      setSelectedFile(null);
      event.target.reset();
      fetchData();
    } catch (err) {
      console.error("Upload failed:", err);
      console.log(`CSV Upload failed: ${err}`);
    }
  };

  async function handleAddCar() {
    if (
      !newCar.name ||
      !newCar.licence_class ||
      !newCar.car_make ||
      !newCar.car_model ||
      !newCar.car_year ||
      !newCar.plate_number
    ) {
      alert("Please fill in all fields");
      return;
    }

    startTransition(async () => {
      try {
        await addPlate({ ...newCar });
        setNewCar({
          name: "",
          licence_class: "",
          car_make: "",
          car_model: "",
          car_year: "",
          plate_number: "",
        });
        setAddDialogOpen(false);
        fetchData();
      } catch (error) {
        alert("Failed to add car. Please try again.");
        console.error(error);
      }
    });
  }

  function togglePlateSelection(plateNumber) {
    setSelectedPlates((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(plateNumber)) {
        newSet.delete(plateNumber);
      } else {
        newSet.add(plateNumber);
      }
      return newSet;
    });
  }

  async function handleDeleteSelected() {
    startTransition(async () => {
      try {
        const platesToDelete = [...selectedPlates];
        await removePlate(platesToDelete);
        setSelectedPlates(new Set());
        setDeleteDialogOpen(false);
        fetchData();
      } catch (error) {
        alert("Failed to delete plates. Please try again.");
        console.error(error);
      }
    });
  }

  return (
    <>
      <Header />
      <div className="m-4">
        <div className="flex items-center">
          <input
            type="text"
            placeholder="Enter search term..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full m-2 p-2 border rounded-lg"
          />

          <form
            onSubmit={handleUploadCsv}
            className="flex items-center gap-4 border rounded-lg p-1"
          >
            <label htmlFor="csv_file" className="flex-grow">
              <input
                type="file"
                id="csv_file"
                accept=".csv"
                onChange={handleFileChange}
                className="h-8 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 block w-full text-sm text-gray-500"
              />
            </label>
            <button
              type="submit"
              disabled={!selectedFile}
              className="h-8 w-32 text-sm p-1 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Upload CSV
            </button>
          </form>

          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="mx-1">Add Car</Button>
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleAddCar}
                  disabled={isPending}
                >
                  Add Car
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="destructive"
                disabled={selectedPlates.size === 0}
              >
                Delete ({selectedPlates.size})
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Deletion</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete {selectedPlates.size} selected
                  plate(s)? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeleteDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDeleteSelected}
                  disabled={isPending}
                >
                  Delete Selected
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mx-2 mt-4 border border-gray-300 rounded-lg">
          <div className="p-2 w-full border-b border-gray-300 bg-gray-50 flex justify-between text-left text-sm font-medium text-gray-500 uppercase">
            <p className="w-full mr-8">Plate Number</p>
            <p className="w-full">Name</p>
            <p className="w-full">Licence Class</p>
            <p className="w-full">Car Make</p>
            <p className="w-full">Car Model</p>
            <p className="w-full">Car Year</p>
          </div>
          {filteredCars.map((item) => (
            <div className="flex items-center justify-between last:border-b-0 hover:bg-gray-50 p-2 w-full border-b border-gray-300 text-gray-900 ">
              <div className="w-8 flex items-center">
                <input
                  type="checkbox"
                  className="w-5 h-5"
                  checked={selectedPlates.has(item.plate_number)}
                  onChange={() => togglePlateSelection(item.plate_number)}
                />
              </div>
              <Link
                href={`/search/${item.plate_number}`}
                className="w-full flex justify-between"
                key={item.id}
              >
                <p className="w-full font-medium">{item.plate_number || "Not specified"}</p>
                <p className="w-full">{item.name || "Not specified"}</p>
                <p className="w-full">{item.licence_class || "Not specified"}</p>
                <p className="w-full">{item.car_make || "Not specified"}</p>
                <p className="w-full">{item.car_model || "Not specified"}</p>
                <p className="w-full">{item.car_year || "Not specified"}</p>
              </Link>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </>
  );
}
