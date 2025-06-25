'use client';

import Link from 'next/link';
import { useEffect, useState, use, useMemo } from 'react';
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
      <p>test</p>
      <Footer />
    </>
  );
}
