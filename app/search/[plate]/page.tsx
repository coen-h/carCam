"use client";

import { useEffect, useState, use, useMemo, useTransition } from "react";
import Footer from "@/app/components/Footer";
import Header from "@/app/components/Header";
import fetchInfo from "@/app/lib/fetchInfo";
import { updatePlate } from "@/app/lib/updatePlate";
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

export default function Plate({ params }) {
  const [data, setData] = useState(null);
  const [events, setEvents] = useState([]);
  const { plate } = use(params);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [editCar, setEditCar] = useState({
    name: "",
    licence_class: "",
    car_make: "",
    car_model: "",
    car_year: "",
    plate_number: "",
  });

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

  function handleInputChange(e) {
    const { name, value } = e.target;
    setEditCar((prev) => ({ ...prev, [name]: value }));
  }

  async function handleEditCar() {
    if (
      !editCar.name ||
      !editCar.licence_class ||
      !editCar.car_make ||
      !editCar.car_model ||
      !editCar.car_year
    ) {
      alert("Please fill in all fields");
      return;
    }

    startTransition(async () => {
      try {
        await updatePlate({ ...editCar });
        console.log("Updating car with data:", editCar);
        setEditDialogOpen(false);
        fetchData();
      } catch (error) {
        alert("Failed to update car. Please try again.");
        console.error(error);
      }
    });
  }

  const openEditDialog = () => {
    // Pre-populate the form with current data
    if (!data) return;

    setEditCar({
      name: data.name || "",
      licence_class: data.licence_class || "",
      car_make: data.car_make || "",
      car_model: data.car_model || "",
      car_year: data.car_year || "",
      plate_number: data.plate_number || "",
    });
    setEditDialogOpen(true);
  };

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

  useEffect(() => {
    fetchData();
  }, []);

  if (!data) {
    return (
      <>
        <Header />
        <div className="mx-auto px-4 py-8 max-w-3xl flex flex-col items-center">
          <div className="text-center">
            <p>Loading plate information...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="mx-auto px-4 py-8 max-w-3xl flex flex-col items-center">
        <div className="flex justify-between items-center mb-6 w-full">
          
          <div>
            <h1 className="text-3xl font-bold">Plate Information</h1>
            <p className="text-muted-foreground">
              Detailed information for plate number {data.plate_number}
            </p>
          </div>

          <div className="flex gap-2">
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openEditDialog}>
                  Edit
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Edit Car Information</DialogTitle>
                  <DialogDescription>
                    Update the details below to modify the car entry.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <Input
                    placeholder="Plate Number"
                    name="plate_number"
                    value={editCar.plate_number}
                    onChange={handleInputChange}
                    disabled
                    className="bg-gray-100 cursor-not-allowed"
                  />
                  <Input
                    placeholder="Name"
                    name="name"
                    value={editCar.name}
                    onChange={handleInputChange}
                  />
                  <Input
                    placeholder="Licence Class"
                    name="licence_class"
                    value={editCar.licence_class}
                    onChange={handleInputChange}
                  />
                  <Input
                    placeholder="Car Make"
                    name="car_make"
                    value={editCar.car_make}
                    onChange={handleInputChange}
                  />
                  <Input
                    placeholder="Car Model"
                    name="car_model"
                    value={editCar.car_model}
                    onChange={handleInputChange}
                  />
                  <Input
                    placeholder="Car Year"
                    name="car_year"
                    value={editCar.car_year}
                    onChange={handleInputChange}
                    type="number"
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleEditCar}
                    disabled={isPending}
                  >
                    Save Changes
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <a href="/search" className="inline-flex">
              <Button variant="outline">
                Back to Search
              </Button>
            </a>
          </div>
        </div>

        <div className="w-full grid gap-6 lg:grid-cols-3">
          <section className="lg:col-span-3 border rounded-lg shadow-sm p-6 bg-white">
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

          <section className="lg:col-span-3 border rounded-lg shadow-sm p-6 bg-white">
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