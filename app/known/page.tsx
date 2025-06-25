'use client';

import Link from 'next/link';
import { useEffect, useState, use, useMemo } from 'react';
import Footer from '@/app/components/Footer';
import Header from '@/app/components/Header';
import fetchSearch from "@/app/lib/fetchSearch"

export default function Home({ params }) {
  const [ data, setData ] = useState([]);
  const { query } = use(params);
  const [searchTerm, setSearchTerm] = useState("")

  const filteredCars = useMemo(() => {
    if (!searchTerm) return data

    return data.filter(
      (user) =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.licence_class.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.car_make.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.plate_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.car_model.toLowerCase().includes(searchTerm.toLowerCase()),
    )
  }, [searchTerm])

  useEffect(() => {
    async function fetchData() {
      try {
        const info = await fetchSearch(query);
        setData(info);
        console.log(info);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    }

    fetchData();
  }, []);

  return (
    <>
      <Header />
      <div>
        <input
          type="text"
          placeholder="Enter search term..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full m-2 p-2 border rounded-lg"
        />
        <div className='mx-2 border border-gray-300 rounded-lg'>
          {filteredCars.map(item => (
            <Link href={`/known/${item.plate_number}`} className='p-2 w-full border-b border-gray-300 flex justify-between last:border-b-0' key={item.id}>
              <p className='w-full'>{item.name}</p>
              <p className='w-full'>{item.licence_class}</p>
              <p className='w-full'>{item.car_make}</p>
              <p className='w-full'>{item.car_model}</p>
              <p className='w-full'>{item.car_year}</p>
              <p className='w-full'>{item.plate_number}</p>
            </Link>
          ))}
        </div>
      </div>
      <Footer />
    </>
  );
}
