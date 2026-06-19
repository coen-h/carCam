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
        <div className="modal-box">
          <h3 className="font-bold text-lg">{mainText}</h3>
          <p className="pb-2">{creationTime ? new Date(creationTime).toLocaleString() : 0}</p>
          <div className="p-4 bg-base-200 rounded">
            <h4 className="font-semibold">Registered User Info:</h4>
            {matched === undefined ? (
              <p className="loading loading-dots loading-sm"></p>
            ) : matched ? (
              <div className="flex items-center gap-2">
                <img src={image} className="rounded w-10 h-10" />
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
      </dialog>
  );
}
