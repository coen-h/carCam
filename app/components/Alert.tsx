'use client';

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { TriangleAlert } from "lucide-react";

interface ActiveAlert {
  _id: string;
  type: string;
  isLeaving: boolean;
}

export default function Alert() {
  const alerts = useQuery(api.function.getAllAlerts); 
  const [activeAlerts, setActiveAlerts] = useState<ActiveAlert[]>([]);
  const [prevAlertCount, setPrevAlertCount] = useState(0);

  useEffect(() => {
    if (alerts === undefined) return;

    if (alerts.length > prevAlertCount && prevAlertCount !== 0) {
      const newAlertsCount = alerts.length - prevAlertCount;
      
      const newAlerts = alerts.slice(0, newAlertsCount);

      newAlerts.forEach((alert) => {
        const alertId = alert._id;

        setActiveAlerts((prev) => [
          ...prev, 
          { _id: alertId, type: alert.type, isLeaving: false }
        ]);

        setTimeout(() => {
          setActiveAlerts((prev) => 
            prev.map((a) => (a._id === alertId ? { ...a, isLeaving: true } : a))
          );
        }, 9500);

        setTimeout(() => {
          setActiveAlerts((prev) => prev.filter((a) => a._id !== alertId));
        }, 10000);
      });
    }

    setPrevAlertCount(alerts.length);

  }, [alerts, prevAlertCount]);

  if (activeAlerts.length === 0) return null;

  return (
    <div className="toast z-50">
      {activeAlerts.map((alert) => (
        <div key={alert._id} className={`alert alert-warning transition-all duration-500 ease-in-out transform ${alert.isLeaving ? "opacity-0 translate-x-full" : "opacity-100 translate-x-0 animate-in slide-in-from-bottom-5 fade-in"}`}>
          <TriangleAlert />
          <span>{alert.type || "New alert arrived!"}</span>
        </div>
      ))}
    </div>
  )
}