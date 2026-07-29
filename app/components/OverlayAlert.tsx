'use client';

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
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
  resolvedStaff?: Id<"users">;
  resolvedMsg?: string;
}

export default function OverlayAlert({alertId, mainText, primaryText, secondaryText, creationTime, matched, resolvedStaff, resolvedMsg}: Props) {
  const resolveAlert = useMutation(api.function.clearAlert); 
  const staffUser = useQuery(
    api.function.getUserById, 
    resolvedStaff ? { userId: resolvedStaff } : "skip"
  );
  const [msg, setMsg] = useState("");
  const [isClearing, setIsClearing] = useState(false);

  const isResolved = !!resolvedStaff;

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
            {isResolved ? (
              <>
                <h4 className="font-semibold mb-2 text-success">Resolved By:</h4>
                {staffUser === undefined ? (
                  <p className="loading loading-dots loading-sm"></p>
                ) : staffUser ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="avatar avatar-placeholder">
                        <div className="bg-neutral text-neutral-content size-10 rounded-box">
                          <span className="text-lg">
                            {(staffUser.name || staffUser.email || "?").charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="leading-tight">
                        <p className="font-semibold">{staffUser.name || "Unknown Staff Member"}</p>
                        <p className="text-sm text-base-content/80">{staffUser.email || "No email available"}</p>
                      </div>
                    </div>
                    {resolvedMsg && (
                      <div className="text-sm bg-base-100 p-3 rounded-lg border border-base-300">
                        <span className="font-semibold">Note:</span> {resolvedMsg}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-error">Staff information no longer available.</p>
                )}
              </>
            ) : (
              <>
                <h4 className="font-semibold">Registered User Info:</h4>
                {matched === undefined ? (
                  <p className="loading loading-dots loading-sm"></p>
                ) : matched ? (
                  <div className="flex items-center gap-3 mt-2">
                    <div className="avatar avatar-placeholder">
                      <div className="bg-neutral text-neutral-content size-10 rounded-box">
                        <span className="text-lg">{primaryText?.split(" ")[0]?.charAt(0) || "?"}</span>
                      </div>
                    </div>
                    <div className="leading-tight">
                      <p className="font-semibold">{primaryText || "Unknown"}</p>
                      <p className="text-sm text-base-content/80">{secondaryText || "Unknown"}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-error mt-1">Unknown driver / Unregistered plate</p>
                )}
              </>
            )}
          </div>

          {!isResolved && (
            <div className="mt-4">
              <input type="text" placeholder="Optional resolution message..." className="input input-bordered w-full" value={msg} onChange={(e) => setMsg(e.target.value)}/>
            </div>
          )}

          <div className="modal-action">
            {alertId && !isResolved && (
              <button className="btn btn-primary" onClick={handleClear} disabled={isClearing}>
                {isClearing ? "Clearing..." : "Clear Alert"}
              </button>
            )}
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
