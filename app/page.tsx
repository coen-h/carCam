'use client';

import { useEffect, useState } from 'react';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import fetchEvents from '@/app/lib/fetchEvents';

export default function Home() {
  const [events, setEvents] = useState([]);
  const [top5Plates, setTop5Plates] = useState<{ plate_number: string; count: number }[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const info = await fetchEvents();
        console.log(info);
        setEvents(info);
        setTop5Plates(getTop5PlateNumbers(info));
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    }

    fetchData();
  }, []);

  if (!events) {
    return <div>Loading...</div>;
  }

  const getTop5PlateNumbers = (
    events: Event[],
  ): { plate_number: string; count: number }[] => {
    const plateCounts: { [key: string]: number } = {};

    events.forEach((event) => {
      plateCounts[event.plate_number] =
        (plateCounts[event.plate_number] || 0) + 1;
    });

    const sortedPlates = Object.entries(plateCounts)
      .map(([plate_number, count]) => ({ plate_number, count }))
      .sort((a, b) => b.count - a.count);

    return sortedPlates.slice(0, 5);
  };

  return (
    <>
      <Header />
      <div className='max-w-[1750px] m-4 flex justify-between'>
        <div>
          <p>PEAK ENTRY AMOUNT TIMELINE</p>
          <p className="font-bold mb-2 text-lg">TOP 5 ENTRIES</p>
          <div className="flex flex-col border rounded-xl p-2 shadow-md bg-white">
            {top5Plates.map((item, index) => (
              <div
                key={item.plate_number}
                className="flex justify-between bg-neutral-100 p-2 m-1 rounded-lg gap-4 text-sm"
              >
                <p>
                  {index + 1}. {item.plate_number}
                </p>
                <p>Count: {item.count}</p>
              </div>
            ))}
          </div>
        </div>
        <div className='flex flex-col border rounded-xl'>
          {events.map((event) => (
            <div key={event.id} className="flex bg-neutral-200 p-2 m-1 rounded-lg gap-2 text-sm">
              <p className="font-medium">{event.plate_number}</p>
              <p className="text-neutral-600">{new Date(event.entry_time).toLocaleDateString()}</p>
              <p className={`font-semibold ${event.known ? 'text-green-600' : 'text-red-600'}`}>{event.known ? 'Known' : 'Unknown'}</p>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </>
  );
}
