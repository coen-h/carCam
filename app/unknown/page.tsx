'use client';

import { useEffect, useState, use } from 'react';
import Footer from '@/app/components/Footer';
import Header from '@/app/components/Header';
import fetchSearch from "@/app/lib/fetchSearch"

export default function Home({ params }) {
  const [ data, setData ] = useState([]);
  const { query } = use(params);

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
        {data.map(item => (
          <div className='flex flex-col' key={item.id}>
            <div className='flex'>
              <h2>{item.name}</h2>
              <p>{item.license_class}</p>
            </div>
            <div className='flex'>
              <h2>{item.plate_number}</h2>
              <p>{item.car_make}</p>
              <p>{item.car_model}</p>
            </div>
          </div>
        ))}
        <p>
          Search results for: {query}
        </p>
        <p>
          {data.results} found.
        </p>
      </div>
      <Footer />
    </>
  );
}
