'use client';

interface Props {
  mainText?: string;
  primaryText?: string;
  secondaryText?: string;
  creationTime?: number;
  matched?: any;
  image?: string;
}

export default function OverlayModal({mainText, primaryText, secondaryText, creationTime, matched}: Props) {
  return (
      <dialog id="my_modal_1" className="modal text-base-content">
        <div className="modal-box max-md:p-4">
          <h3 className="font-bold text-xl text-primary">{mainText}</h3>
          <p className="pb-2 text-sm text-base-content/60">{creationTime ? new Date(creationTime).toLocaleString() : 0}</p>
          <div className="p-4 bg-base-200 rounded">
            <h4 className="font-semibold">Registered User Info:</h4>
            {matched === undefined ? (
              <p className="loading loading-dots loading-sm"></p>
            ) : matched ? (
              <div className="flex items-center gap-3 mt-2">
                {/* <img src={image} className="rounded size-10" /> */}
                {/* <img src="https://cdn.pixabay.com/photo/2023/02/18/11/00/icon-7797704_640.png" className="rounded size-10" /> */}
                <div className="avatar avatar-placeholder">
                  <div className="bg-base-content/80 size-10 rounded-box">
                    <span className="text-lg text-base-100">{primaryText?.split(" ")[0]?.charAt(0) || "?"}</span>
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
          </div>
          <div className="modal-action">
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
