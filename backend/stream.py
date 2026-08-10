import sys
import time

import gi
import pyzed.sl as sl

gi.require_version("Gst", "1.0")
gi.require_version("GstRtspServer", "1.0")
from gi.repository import GLib, Gst, GstRtspServer


class ZEDRTSPMediaFactory(GstRtspServer.RTSPMediaFactory):
    def __init__(self, **properties):
        super().__init__(**properties)
        self.zed = sl.Camera()
        self.init_params = sl.InitParameters()
        self.init_params.camera_resolution = sl.RESOLUTION.HD1080
        self.init_params.camera_fps = 30

        # Only the left RGB image is streamed. Computing a depth map on every
        # grab consumed most of the Nano GPU without producing a used output.
        self.init_params.depth_mode = sl.DEPTH_MODE.NONE

        print("Initializing ZED camera...")
        status = self.zed.open(self.init_params)
        if status != sl.ERROR_CODE.SUCCESS:
            print(f"Failed to open ZED camera: {status}")
            raise SystemExit(1)

        self.image = sl.Mat()
        self.number_frames = 0
        self.report_started_at = time.monotonic()
        self.report_started_frame = 0

    def do_configure(self, media):
        appsrc = media.get_element().get_by_name("mysrc")
        appsrc.connect("need-data", self.on_need_data)

    def do_create_element(self, _url):
        print("RTSP client connected; starting 1080p hardware pipeline...")
        pipeline = (
            "appsrc name=mysrc is-live=true block=true do-timestamp=true "
            "format=time caps=video/x-raw,format=BGRx,width=1920,height=1080,"
            "framerate=30/1 ! "
            "nvvidconv ! video/x-raw(memory:NVMM),format=NV12 ! "
            "nvv4l2h264enc maxperf-enable=1 bitrate=2500000 "
            "insert-sps-pps=true idrinterval=30 iframeinterval=30 ! "
            "h264parse ! rtph264pay config-interval=1 name=pay0 pt=96"
        )
        return Gst.parse_launch(pipeline)

    def on_need_data(self, src, _length):
        if self.zed.grab() != sl.ERROR_CODE.SUCCESS:
            return

        self.zed.retrieve_image(self.image, sl.VIEW.LEFT)

        # ZED returns BGRA and BGRx has the same byte layout. `new_wrapped`
        # lets GStreamer own the bytes directly instead of allocating another
        # full 1080p buffer and copying the image into it a second time.
        data = self.image.get_data().tobytes()
        buffer = Gst.Buffer.new_wrapped(data)
        buffer.duration = Gst.util_uint64_scale_int(1, Gst.SECOND, 30)

        result = src.emit("push-buffer", buffer)
        if result != Gst.FlowReturn.OK:
            print(f"GStreamer push-buffer returned: {result}")
            return

        self.number_frames += 1
        if self.number_frames % 150 == 0:
            now = time.monotonic()
            elapsed = now - self.report_started_at
            frames = self.number_frames - self.report_started_frame
            fps = frames / elapsed if elapsed > 0 else 0.0
            print(f"[STREAM] {self.number_frames} frames | ~{fps:.1f} fps")
            self.report_started_at = now
            self.report_started_frame = self.number_frames


def main():
    Gst.init(sys.argv)
    server = GstRtspServer.RTSPServer()
    server.set_address("0.0.0.0")
    server.set_service("8555")

    factory = ZEDRTSPMediaFactory()
    factory.set_shared(True)
    server.get_mount_points().add_factory("/zed_stream", factory)
    server.attach(None)

    print("RTSP server online")
    print("Stream: rtsp://<nano-ip>:8555/zed_stream")

    loop = GLib.MainLoop()
    try:
        loop.run()
    except KeyboardInterrupt:
        print("Shutting down ZED camera...")
    finally:
        factory.zed.close()


if __name__ == "__main__":
    main()
