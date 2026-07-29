'use client';

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface Props {
  alertId?: Id<"alerts">;
  mainText?: string;
  primaryText?: string;
  secondaryText?: string;
  creationTime?: number;
  matched?: any;
  image?: string;
}

export default function OverlayAlert({alertId, mainText, primaryText, secondaryText, creationTime, matched}: Props) {
  const resolveAlert = useMutation(api.function.clearAlert); 
  const [msg, setMsg] = useState("");
  const [isClearing, setIsClearing] = useState(false);

  const handleClear = async () => {
    if (!alertId) return;
    
    setIsClearing(true);
    try {
      await resolveAlert({ 
        alertId, 
        resolvedMsg: msg !== "" ? msg : undefined 
      });
      
      setMsg("");
      (document.getElementById('my_modal_2') as HTMLDialogElement).close();
    } catch (error) {
      console.error("Failed to clear alert:", error);
    } finally {
      setIsClearing(false);
    }
  };

  return (
      <dialog id="my_modal_2" className="modal text-base-content">
        <div className="modal-box max-md:p-4">
          <h3 className="font-bold text-xl text-primary">{mainText}</h3>
          <p className="pb-2 text-sm text-base-content/60">{creationTime ? new Date(creationTime).toLocaleString() : 0}</p>
          <div className="p-4 bg-base-200 rounded">
            <h4 className="font-semibold mb-1">Registered User Info:</h4>
            {matched === undefined ? (
              <p className="loading loading-dots loading-sm"></p>
            ) : matched ? (
              <div className="flex items-center gap-2">
                <div className="avatar avatar-placeholder">
                  <div className="bg-neutral text-neutral-content size-12 rounded-box">
                    <span className="text-xl">{primaryText?.split(" ")[0]?.charAt(0)}</span>
                  </div>
                </div>
                <div>
                  <p>{primaryText || "Unknown"}</p>
                  <p>{secondaryText || "Unknown"}</p>
                </div>
              </div>
            ) : (
              <p className="text-error">Unknown driver / Unregistered plate</p>
            )}
          </div>
          <div className="mt-4">
            <input type="text" placeholder="Optional resolution message..." className="input input-bordered w-full" value={msg} onChange={(e) => setMsg(e.target.value)}/>
          </div>
          <div className="modal-action">
            <button className="btn btn-primary" onClick={handleClear} disabled={isClearing || !alertId}>
              {isClearing ? "Clearing..." : "Clear Alert"}
            </button>
            <form method="dialog">
              <button className="btn">Close</button>
            </form>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
  );
}
