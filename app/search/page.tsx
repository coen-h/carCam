'use client';

import Link from 'next/link';
import { useEffect, useState, useMemo, useTransition } from 'react';
import Footer from '@/app/components/Footer';
import Header from '@/app/components/Header';
import fetchSearch from '@/app/lib/fetchSearch';
import { addCar } from '@/app/lib/addCar';
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

export default function Home() {
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
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

  const filteredCars = useMemo(() => {
    if (!searchTerm) return data;

    return data.filter(
      (user) =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.licence_class.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.car_make.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.plate_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.car_model.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, data]);

  async function fetchData() {
    try {
      const info = await fetchSearch();
      setData(info);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        const info = await fetchSearch();
        setData(info);
        console.log(info);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    }

    fetchData();
  }, []);

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
        await addCar({
          ...newCar
        });

        await fetchData();

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

  return (
    <>
      <Header />
      <div className="m-4">
        <input
          type="text"
          placeholder="Enter search term..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full m-2 p-2 border rounded-lg"
        />

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="mx-2">Add New Car</Button>
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

        <div className="mx-2 mt-4 border border-gray-300 rounded-lg">
          {filteredCars.map((item) => (
            <Link
              href={`/search/${item.plate_number}`}
              className="p-2 w-full border-b border-gray-300 flex justify-between last:border-b-0"
              key={item.id}
            >
              <p className="w-full">{item.name || 'Not specified'}</p>
              <p className="w-full">{item.licence_class || 'Not specified'}</p>
              <p className="w-full">{item.car_make || 'Not specified'}</p>
              <p className="w-full">{item.car_model || 'Not specified'}</p>
              <p className="w-full">{item.car_year || 'Not specified'}</p>
              <p className="w-full">{item.plate_number || 'Not specified'}</p>
            </Link>
          ))}
        </div>
      </div>
      <Footer />
    </>
  );
}