"use client";

import { useEffect, useState, use, useMemo } from "react";
import Footer from "@/app/components/Footer";
import Header from "@/app/components/Header";
import fetchInfo from "@/app/lib/fetchInfo";

export default function Home({ params }) {
  const [data, setData] = useState([]);
  const [events, setEvents] = useState([]);
  const { plate } = use(params);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);

  function formatDateTime(timestamp) {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: true,
    }).format(date);
  }

  function formatTime(timestamp) {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: true,
    }).format(date);
  }

  const handleViewClip = (clipUrl: string) => {
    setCurrentVideoUrl(clipUrl);
    setShowVideoModal(true);
  };

  const handleCloseVideoModal = () => {
    setCurrentVideoUrl(null);
    setShowVideoModal(false);
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const info = await fetchInfo(plate);
        setData(info.results);
        setEvents(info.events);
        console.log(events);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    }

    fetchData();
  }, []);

  return (
    <>
      <Header />
      <div className="mx-auto px-4 py-8 max-w-6xl flex flex-col items-center">
        <div className="flex items-center gap-32 mb-6">
          
          <div>
            <h1 className="text-3xl font-bold">Plate Information</h1>
            <p className="text-muted-foreground">
              Detailed information for plate number {data.plate_number}
            </p>
          </div>
          <a href="/search" className="inline-flex">
            <button
              type="button"
              className="inline-flex items-center border border-gray-300 rounded px-3 py-1 text-sm hover:bg-gray-100"
            >
              Back to Search
            </button>
          </a>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="lg:col-span-2 border rounded-lg shadow-sm p-6 bg-white">
            <header>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl flex items-center gap-2 font-semibold">
                    {data.plate_number}
                  </h2>
                  <p className="text-sm text-gray-500">Added on</p>
                </div>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                    data.known
                      ? "bg-gray-200 text-gray-800"
                      : "bg-gray-400 text-white"
                  }`}
                >
                  {data.known ? "Known" : "Unknown"}
                </span>
              </div>
            </header>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2 mb-3">
                  Owner Information
                </h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground block">
                      Name
                    </label>
                    <p className="text-lg">{data.name || "Not specified"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground block">
                      License Class
                    </label>
                    <p className="text-lg">
                      {data.licence_class || "Not specified"}
                    </p>
                  </div>
                </div>
              </div>

              <hr className="border-t border-gray-200" />

              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2 mb-3">
                  Vehicle Details
                </h3>
                <div className="grid gap-3 md:grid-cols-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground block">
                      Make
                    </label>
                    <p className="text-lg">
                      {data.car_make || "Not specified"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground block">
                      Model
                    </label>
                    <p className="text-lg">
                      {data.car_model || "Not specified"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground block">
                      Year
                    </label>
                    <p className="text-lg">
                      {data.car_year || "Not specified"}
                    </p>
                  </div>
                </div>
              </div>

              {data.notes && (
                <>
                  <hr className="border-t border-gray-200" />

                  <div>
                    <h3 className="font-semibold text-lg flex items-center gap-2 mb-3">
                      Notes
                    </h3>
                    <div className="bg-muted/50 rounded-lg p-4 bg-gray-100">
                      <p className="text-sm leading-relaxed">{data.notes}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>

          <section className="lg:col-span-2 border rounded-lg shadow-sm p-6 bg-white">
            <header className="mb-4">
              <h2 className="flex items-center gap-2 text-xl font-semibold">
                Recent Events
              </h2>
              <p className="text-sm text-gray-500">
                Entry and exit records for this vehicle
              </p>
            </header>
            <div className="space-y-4">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <div>
                      <p className="font-medium">{event.location}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Entry: {formatTime(event.entry_time)}</span>
                        <span>Exit: {formatTime(event.exit_time)}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDateTime(event.entry_time).split(",")[0]}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {event.clip_url ? ( 
                        <button
                          type="button"
                          onClick={() => handleViewClip(event.clip_url!)}
                          className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
                        >
                          View Clip
                        </button>
                      ) : (
                        <span className="text-sm text-gray-400">No Clip</span>
                      )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
      <Footer />

      {showVideoModal && currentVideoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="relative bg-black rounded-lg shadow-xl overflow-hidden w-full max-w-6xl max-h-[90vh]">
            <button
              onClick={handleCloseVideoModal}
              className="absolute top-1 right-3 text-gray-400 hover:text-gray-600 text-3xl font-bold z-10"
              aria-label="Close video"
            >
              &times;
            </button>
            <div className="relative pb-[56.25%] h-0 overflow-hidden">    
              <video
                controls
                autoPlay
                className="absolute top-0 left-0 w-full h-full"
                src={currentVideoUrl}
                onEnded={handleCloseVideoModal}
              >
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
