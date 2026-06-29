import { TriangleAlert } from "lucide-react";

export default function Alert() {
  return (
    <div className="toast">
      <div className="alert alert-warning">
        <TriangleAlert />
        <span>New message arrived.</span>
      </div>
    </div>
  )
}