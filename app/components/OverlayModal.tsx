'use client';

interface Props {
  mainText?: string;
  primaryText?: string;
  secondaryText?: string;
  creationTime?: number;
  matched?: any;
  image?: string;
}

export default function overlayModal({mainText, primaryText, secondaryText, creationTime, matched, image}: Props) {
  return (
      <dialog id="my_modal_1" className="modal text-base-content">
        <div className="modal-box max-md:p-4">
          <h3 className="font-bold text-xl text-primary">{mainText}</h3>
          <p className="pb-2 text-sm text-base-content/60">{creationTime ? new Date(creationTime).toLocaleString() : 0}</p>
          <div className="p-4 bg-base-200 rounded">
            <h4 className="font-semibold mb-1">Registered User Info:</h4>
            {matched === undefined ? (
              <p className="loading loading-dots loading-sm"></p>
            ) : matched ? (
              <div className="flex items-center gap-2">
                {/* <img src={image} className="rounded size-10" /> */}
                {/* <img src="https://cdn.pixabay.com/photo/2023/02/18/11/00/icon-7797704_640.png" className="rounded size-10" /> */}
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
