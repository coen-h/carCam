// Native ZED RTSP launcher with an optional, non-blocking vehicle trigger observer.
//
// This file is based on Stereolabs zed-gstreamer v4.2.5. The RTSP mount remains
// /zed_stream for compatibility with the existing MediaMTX configuration.

#include <gst/gst.h>
#include <gst/gstparse.h>
#include <gst/rtsp-server/rtsp-server.h>
#include <gst/rtsp/gstrtspconnection.h>
#include <glib/gstdio.h>

#include <algorithm>
#include <cmath>
#include <cstdlib>
#include <cstring>
#include <iomanip>
#include <iostream>
#include <limits>
#include <sstream>
#include <string>
#include <vector>

#include "gstzedmeta.h"

#define DEFAULT_RTSP_PORT "8554"
#define DEFAULT_RTSP_HOST "127.0.0.1"

static char *port = (char *) DEFAULT_RTSP_PORT;
static char *host = (char *) DEFAULT_RTSP_HOST;
static char *trigger_config_path = NULL;

struct TriggerConfig {
    bool enabled = false;
    bool shadow_mode = true;
    bool zone_enabled = false;
    bool include_car = true;
    bool include_truck = true;
    bool include_bus = true;
    bool include_motorbike = false;
    float min_confidence = 40.0f;
    unsigned int min_observations = 3;
    unsigned int confirmation_window_ms = 1500;
    unsigned int hold_seconds = 12;
    unsigned int status_interval_ms = 1000;
    float zone_min[3] = {-10000.0f, -10000.0f, 0.0f};
    float zone_max[3] = {10000.0f, 10000.0f, 20000.0f};
    std::string state_path = "/home/coen/zed-native-rtsp/state/trigger-state.json";
};

struct VehicleSnapshot {
    int id = -1;
    int subclass = -1;
    float confidence = 0.0f;
    float position[3] = {0.0f, 0.0f, 0.0f};
    float dimensions[3] = {0.0f, 0.0f, 0.0f};
    float bbox_min[3] = {0.0f, 0.0f, 0.0f};
    float bbox_max[3] = {0.0f, 0.0f, 0.0f};
    bool intersects_zone = false;
};

struct TriggerSnapshot {
    bool shadow_mode = true;
    bool zone_enabled = false;
    bool would_be_active = false;
    bool publish_state_change = false;
    guint64 frame_id = 0;
    guint64 frames_seen = 0;
    guint64 candidate_observations = 0;
    guint64 activations = 0;
    unsigned int confirmation_count = 0;
    gint64 timestamp_ms = 0;
    std::vector<VehicleSnapshot> vehicles;
};

struct TriggerRuntime {
    bool would_be_active = false;
    guint64 frames_seen = 0;
    guint64 candidate_observations = 0;
    guint64 activations = 0;
    unsigned int confirmation_count = 0;
    gint64 confirmation_window_start_us = 0;
    gint64 last_candidate_us = 0;
    gint64 last_publish_us = 0;
    gint64 last_observation_log_us = 0;
};

static TriggerConfig trigger_config;
static TriggerRuntime trigger_runtime;
static volatile gint publish_pending = 0;

static GOptionEntry entries[] = {
    {"port", 'p', 0, G_OPTION_ARG_STRING, &port,
     "Port to listen on (default: " DEFAULT_RTSP_PORT ")", "PORT"},
    {"address", 'a', 0, G_OPTION_ARG_STRING, &host,
     "Host address (default: " DEFAULT_RTSP_HOST ")", "HOST"},
    {"trigger-config", 0, 0, G_OPTION_ARG_FILENAME, &trigger_config_path,
     "Optional vehicle trigger observer configuration", "FILE"},
    {NULL}};

static bool key_has(GKeyFile *file, const char *group, const char *key) {
    return g_key_file_has_key(file, group, key, NULL) == TRUE;
}

static bool get_bool(GKeyFile *file, const char *group, const char *key, bool fallback) {
    if (!key_has(file, group, key)) {
        return fallback;
    }
    GError *error = NULL;
    gboolean value = g_key_file_get_boolean(file, group, key, &error);
    if (error) {
        g_printerr("[TRIGGER] Invalid %s.%s: %s\n", group, key, error->message);
        g_clear_error(&error);
        return fallback;
    }
    return value == TRUE;
}

static int get_int(GKeyFile *file, const char *group, const char *key, int fallback) {
    if (!key_has(file, group, key)) {
        return fallback;
    }
    GError *error = NULL;
    int value = g_key_file_get_integer(file, group, key, &error);
    if (error) {
        g_printerr("[TRIGGER] Invalid %s.%s: %s\n", group, key, error->message);
        g_clear_error(&error);
        return fallback;
    }
    return value;
}

static double get_double(GKeyFile *file, const char *group, const char *key,
                         double fallback) {
    if (!key_has(file, group, key)) {
        return fallback;
    }
    GError *error = NULL;
    double value = g_key_file_get_double(file, group, key, &error);
    if (error) {
        g_printerr("[TRIGGER] Invalid %s.%s: %s\n", group, key, error->message);
        g_clear_error(&error);
        return fallback;
    }
    return value;
}

static std::string get_string(GKeyFile *file, const char *group, const char *key,
                              const std::string &fallback) {
    if (!key_has(file, group, key)) {
        return fallback;
    }
    GError *error = NULL;
    gchar *value = g_key_file_get_string(file, group, key, &error);
    if (error) {
        g_printerr("[TRIGGER] Invalid %s.%s: %s\n", group, key, error->message);
        g_clear_error(&error);
        return fallback;
    }
    std::string result(value ? value : "");
    g_free(value);
    return result;
}

static bool load_trigger_config(const char *path) {
    if (!path) {
        return true;
    }

    GKeyFile *file = g_key_file_new();
    GError *error = NULL;
    if (!g_key_file_load_from_file(file, path, G_KEY_FILE_NONE, &error)) {
        g_printerr("[TRIGGER] Cannot load %s: %s\n", path, error->message);
        g_clear_error(&error);
        g_key_file_free(file);
        return false;
    }

    trigger_config.enabled = get_bool(file, "trigger", "enabled", false);
    trigger_config.shadow_mode = get_bool(file, "trigger", "shadow-mode", true);
    trigger_config.min_confidence =
        static_cast<float>(get_double(file, "trigger", "min-confidence", 40.0));
    trigger_config.min_observations = static_cast<unsigned int>(
        std::max(1, get_int(file, "trigger", "min-observations", 3)));
    trigger_config.confirmation_window_ms = static_cast<unsigned int>(
        std::max(100, get_int(file, "trigger", "confirmation-window-ms", 1500)));
    trigger_config.hold_seconds = static_cast<unsigned int>(
        std::max(1, get_int(file, "trigger", "hold-seconds", 12)));
    trigger_config.status_interval_ms = static_cast<unsigned int>(
        std::max(200, get_int(file, "trigger", "status-interval-ms", 1000)));
    trigger_config.state_path = get_string(
        file, "trigger", "state-path", trigger_config.state_path);
    trigger_config.include_car = get_bool(file, "classes", "car", true);
    trigger_config.include_truck = get_bool(file, "classes", "truck", true);
    trigger_config.include_bus = get_bool(file, "classes", "bus", true);
    trigger_config.include_motorbike =
        get_bool(file, "classes", "motorbike", false);

    trigger_config.zone_enabled = get_bool(file, "zone", "enabled", false);
    trigger_config.zone_min[0] =
        static_cast<float>(get_double(file, "zone", "min-x-mm", -10000.0));
    trigger_config.zone_min[1] =
        static_cast<float>(get_double(file, "zone", "min-y-mm", -10000.0));
    trigger_config.zone_min[2] =
        static_cast<float>(get_double(file, "zone", "min-z-mm", 0.0));
    trigger_config.zone_max[0] =
        static_cast<float>(get_double(file, "zone", "max-x-mm", 10000.0));
    trigger_config.zone_max[1] =
        static_cast<float>(get_double(file, "zone", "max-y-mm", 10000.0));
    trigger_config.zone_max[2] =
        static_cast<float>(get_double(file, "zone", "max-z-mm", 20000.0));
    g_key_file_free(file);

    if (trigger_config.min_confidence < 0.0f || trigger_config.min_confidence > 100.0f) {
        g_printerr("[TRIGGER] min-confidence must be between 0 and 100\n");
        return false;
    }
    for (int axis = 0; axis < 3; ++axis) {
        if (trigger_config.zone_min[axis] >= trigger_config.zone_max[axis]) {
            g_printerr("[TRIGGER] Zone minimum must be below maximum on every axis\n");
            return false;
        }
    }

    if (trigger_config.enabled) {
        gchar *parent = g_path_get_dirname(trigger_config.state_path.c_str());
        if (g_mkdir_with_parents(parent, 0755) != 0) {
            g_printerr("[TRIGGER] Cannot create state directory %s\n", parent);
            g_free(parent);
            return false;
        }
        g_free(parent);
    }
    return true;
}

static const char *subclass_name(int subclass) {
    switch (static_cast<OBJECT_SUBCLASS>(subclass)) {
    case OBJECT_SUBCLASS::CAR:
        return "car";
    case OBJECT_SUBCLASS::TRUCK:
        return "truck";
    case OBJECT_SUBCLASS::BUS:
        return "bus";
    case OBJECT_SUBCLASS::MOTORBIKE:
        return "motorbike";
    case OBJECT_SUBCLASS::BICYCLE:
        return "bicycle";
    default:
        return "other";
    }
}

static bool included_subclass(OBJECT_SUBCLASS subclass) {
    switch (subclass) {
    case OBJECT_SUBCLASS::CAR:
        return trigger_config.include_car;
    case OBJECT_SUBCLASS::TRUCK:
        return trigger_config.include_truck;
    case OBJECT_SUBCLASS::BUS:
        return trigger_config.include_bus;
    case OBJECT_SUBCLASS::MOTORBIKE:
        return trigger_config.include_motorbike;
    default:
        return false;
    }
}

static bool make_vehicle_snapshot(const ZedObjectData &object, VehicleSnapshot *snapshot) {
    snapshot->id = object.id;
    snapshot->subclass = static_cast<int>(object.sublabel);
    snapshot->confidence = object.confidence;
    std::copy(object.position, object.position + 3, snapshot->position);
    std::copy(object.dimensions, object.dimensions + 3, snapshot->dimensions);

    for (int axis = 0; axis < 3; ++axis) {
        snapshot->bbox_min[axis] = std::numeric_limits<float>::infinity();
        snapshot->bbox_max[axis] = -std::numeric_limits<float>::infinity();
    }

    bool bbox_valid = true;
    for (int vertex = 0; vertex < 8; ++vertex) {
        for (int axis = 0; axis < 3; ++axis) {
            const float value = object.bounding_box_3d[vertex][axis];
            if (!std::isfinite(value)) {
                bbox_valid = false;
                continue;
            }
            snapshot->bbox_min[axis] = std::min(snapshot->bbox_min[axis], value);
            snapshot->bbox_max[axis] = std::max(snapshot->bbox_max[axis], value);
        }
    }

    if (!bbox_valid) {
        for (int axis = 0; axis < 3; ++axis) {
            if (!std::isfinite(object.position[axis])) {
                return false;
            }
            snapshot->bbox_min[axis] = object.position[axis];
            snapshot->bbox_max[axis] = object.position[axis];
        }
    }

    snapshot->intersects_zone = !trigger_config.zone_enabled;
    if (trigger_config.zone_enabled) {
        snapshot->intersects_zone = true;
        for (int axis = 0; axis < 3; ++axis) {
            if (snapshot->bbox_max[axis] < trigger_config.zone_min[axis] ||
                snapshot->bbox_min[axis] > trigger_config.zone_max[axis]) {
                snapshot->intersects_zone = false;
                break;
            }
        }
    }
    return true;
}

static std::string json_number(float value) {
    if (!std::isfinite(value)) {
        return "null";
    }
    std::ostringstream out;
    out << std::fixed << std::setprecision(2) << value;
    return out.str();
}

static gboolean publish_snapshot(gpointer data) {
    TriggerSnapshot *snapshot = static_cast<TriggerSnapshot *>(data);
    std::ostringstream json;
    json << "{\n"
         << "  \"schemaVersion\": 1,\n"
         << "  \"timestampUnixMs\": " << snapshot->timestamp_ms << ",\n"
         << "  \"shadowMode\": " << (snapshot->shadow_mode ? "true" : "false") << ",\n"
         << "  \"zoneEnabled\": " << (snapshot->zone_enabled ? "true" : "false") << ",\n"
         << "  \"state\": \"" << (snapshot->would_be_active ? "active" : "idle") << "\",\n"
         << "  \"actionable\": "
         << ((!snapshot->shadow_mode && snapshot->would_be_active) ? "true" : "false") << ",\n"
         << "  \"frameId\": " << snapshot->frame_id << ",\n"
         << "  \"confirmationCount\": " << snapshot->confirmation_count << ",\n"
         << "  \"vehicleCount\": " << snapshot->vehicles.size() << ",\n"
         << "  \"statistics\": {\"framesSeen\": " << snapshot->frames_seen
         << ", \"candidateObservations\": " << snapshot->candidate_observations
         << ", \"activations\": " << snapshot->activations << "},\n"
         << "  \"vehicles\": [";

    for (size_t index = 0; index < snapshot->vehicles.size(); ++index) {
        const VehicleSnapshot &vehicle = snapshot->vehicles[index];
        if (index != 0) {
            json << ',';
        }
        json << "\n    {\"id\": " << vehicle.id << ", \"subclass\": \""
             << subclass_name(vehicle.subclass) << "\", \"confidence\": "
             << json_number(vehicle.confidence) << ", \"positionMm\": ["
             << json_number(vehicle.position[0]) << ',' << json_number(vehicle.position[1])
             << ',' << json_number(vehicle.position[2]) << "], \"dimensionsMm\": ["
             << json_number(vehicle.dimensions[0]) << ',' << json_number(vehicle.dimensions[1])
             << ',' << json_number(vehicle.dimensions[2]) << "], \"bboxMinMm\": ["
             << json_number(vehicle.bbox_min[0]) << ',' << json_number(vehicle.bbox_min[1])
             << ',' << json_number(vehicle.bbox_min[2]) << "], \"bboxMaxMm\": ["
             << json_number(vehicle.bbox_max[0]) << ',' << json_number(vehicle.bbox_max[1])
             << ',' << json_number(vehicle.bbox_max[2]) << "], \"intersectsZone\": "
             << (vehicle.intersects_zone ? "true" : "false") << '}';
    }
    if (!snapshot->vehicles.empty()) {
        json << '\n';
    }
    json << "  ]\n}\n";

    const std::string temporary_path = trigger_config.state_path + ".tmp";
    GError *error = NULL;
    if (!g_file_set_contents(temporary_path.c_str(), json.str().c_str(),
                             static_cast<gssize>(json.str().size()), &error)) {
        g_printerr("[TRIGGER] State write failed: %s\n", error->message);
        g_clear_error(&error);
    } else if (g_rename(temporary_path.c_str(), trigger_config.state_path.c_str()) != 0) {
        g_printerr("[TRIGGER] State rename failed for %s\n", trigger_config.state_path.c_str());
    }

    if (snapshot->publish_state_change) {
        g_print("[TRIGGER] %s%s confirmations=%u frame=%" G_GUINT64_FORMAT "\n",
                snapshot->shadow_mode ? "shadow would " : "",
                snapshot->would_be_active ? "activate" : "deactivate",
                snapshot->confirmation_count, snapshot->frame_id);
    }
    if (!snapshot->vehicles.empty()) {
        const VehicleSnapshot &vehicle = snapshot->vehicles.front();
        g_print("[TRIGGER] observed %zu vehicle(s); first=%s confidence=%.1f position-mm=(%.0f,%.0f,%.0f) zone=%s\n",
                snapshot->vehicles.size(), subclass_name(vehicle.subclass), vehicle.confidence,
                vehicle.position[0], vehicle.position[1], vehicle.position[2],
                vehicle.intersects_zone ? "yes" : "no");
    }

    delete snapshot;
    g_atomic_int_set(&publish_pending, 0);
    return G_SOURCE_REMOVE;
}

static GstPadProbeReturn trigger_probe(GstPad *, GstPadProbeInfo *info, gpointer) {
    GstBuffer *buffer = GST_PAD_PROBE_INFO_BUFFER(info);
    if (!buffer) {
        return GST_PAD_PROBE_OK;
    }

    GstZedSrcMeta *meta = gst_buffer_get_zed_src_meta(buffer);
    if (!meta || !meta->od_enabled) {
        return GST_PAD_PROBE_OK;
    }

    const gint64 now_us = g_get_monotonic_time();
    trigger_runtime.frames_seen++;
    std::vector<VehicleSnapshot> candidates;

    for (guint index = 0; index < meta->obj_count; ++index) {
        const ZedObjectData &object = meta->objects[index];
        if (object.label != OBJECT_CLASS::VEHICLE ||
            !included_subclass(object.sublabel) ||
            object.confidence < trigger_config.min_confidence) {
            continue;
        }
        VehicleSnapshot snapshot;
        if (make_vehicle_snapshot(object, &snapshot) && snapshot.intersects_zone) {
            candidates.push_back(snapshot);
        }
    }

    bool state_changed = false;
    if (!candidates.empty()) {
        trigger_runtime.candidate_observations++;
        trigger_runtime.last_candidate_us = now_us;
        const gint64 window_us =
            static_cast<gint64>(trigger_config.confirmation_window_ms) * 1000;
        if (trigger_runtime.confirmation_window_start_us == 0 ||
            now_us - trigger_runtime.confirmation_window_start_us > window_us) {
            trigger_runtime.confirmation_window_start_us = now_us;
            trigger_runtime.confirmation_count = 0;
        }
        trigger_runtime.confirmation_count++;
        if (!trigger_runtime.would_be_active &&
            trigger_runtime.confirmation_count >= trigger_config.min_observations) {
            trigger_runtime.would_be_active = true;
            trigger_runtime.activations++;
            state_changed = true;
        }
    } else if (trigger_runtime.would_be_active) {
        const gint64 hold_us = static_cast<gint64>(trigger_config.hold_seconds) * G_USEC_PER_SEC;
        if (trigger_runtime.last_candidate_us > 0 &&
            now_us - trigger_runtime.last_candidate_us >= hold_us) {
            trigger_runtime.would_be_active = false;
            trigger_runtime.confirmation_count = 0;
            trigger_runtime.confirmation_window_start_us = 0;
            state_changed = true;
        }
    } else if (trigger_runtime.confirmation_window_start_us > 0 &&
               now_us - trigger_runtime.confirmation_window_start_us >
                   static_cast<gint64>(trigger_config.confirmation_window_ms) * 1000) {
        trigger_runtime.confirmation_count = 0;
        trigger_runtime.confirmation_window_start_us = 0;
    }

    const bool status_due =
        trigger_runtime.last_publish_us == 0 ||
        now_us - trigger_runtime.last_publish_us >=
            static_cast<gint64>(trigger_config.status_interval_ms) * 1000;
    if ((state_changed || status_due) &&
        g_atomic_int_compare_and_exchange(&publish_pending, 0, 1)) {
        TriggerSnapshot *snapshot = new TriggerSnapshot();
        snapshot->shadow_mode = trigger_config.shadow_mode;
        snapshot->zone_enabled = trigger_config.zone_enabled;
        snapshot->would_be_active = trigger_runtime.would_be_active;
        snapshot->publish_state_change = state_changed;
        snapshot->frame_id = meta->frame_id;
        snapshot->frames_seen = trigger_runtime.frames_seen;
        snapshot->candidate_observations = trigger_runtime.candidate_observations;
        snapshot->activations = trigger_runtime.activations;
        snapshot->confirmation_count = trigger_runtime.confirmation_count;
        snapshot->timestamp_ms = g_get_real_time() / 1000;
        snapshot->vehicles.swap(candidates);
        trigger_runtime.last_publish_us = now_us;
        g_main_context_invoke(NULL, publish_snapshot, snapshot);
    }
    return GST_PAD_PROBE_OK;
}

static GstElement *find_zed_source(GstElement *root) {
    if (!GST_IS_BIN(root)) {
        return NULL;
    }
    GstIterator *iterator = gst_bin_iterate_recurse(GST_BIN(root));
    GValue item = G_VALUE_INIT;
    GstElement *result = NULL;
    while (gst_iterator_next(iterator, &item) == GST_ITERATOR_OK) {
        GstElement *element = GST_ELEMENT(g_value_get_object(&item));
        GstElementFactory *factory = gst_element_get_factory(element);
        const gchar *name = factory ? gst_plugin_feature_get_name(GST_PLUGIN_FEATURE(factory)) : NULL;
        if (name && g_strcmp0(name, "zedsrc") == 0) {
            result = GST_ELEMENT(gst_object_ref(element));
            g_value_unset(&item);
            break;
        }
        g_value_unset(&item);
    }
    gst_iterator_free(iterator);
    return result;
}

static void media_configure(GstRTSPMediaFactory *, GstRTSPMedia *media, gpointer) {
    if (!trigger_config.enabled) {
        return;
    }
    GstElement *pipeline = gst_rtsp_media_get_element(media);
    GstElement *source = find_zed_source(pipeline);
    if (!source) {
        g_printerr("[TRIGGER] Could not find zedsrc in the RTSP media pipeline\n");
        gst_object_unref(pipeline);
        return;
    }
    GstPad *source_pad = gst_element_get_static_pad(source, "src");
    if (!source_pad) {
        g_printerr("[TRIGGER] Could not obtain the zedsrc source pad\n");
    } else {
        gst_pad_add_probe(source_pad, GST_PAD_PROBE_TYPE_BUFFER, trigger_probe, NULL, NULL);
        g_print("[TRIGGER] Observer attached (shadow=%s zone=%s state=%s)\n",
                trigger_config.shadow_mode ? "yes" : "no",
                trigger_config.zone_enabled ? "enabled" : "calibration/all vehicles",
                trigger_config.state_path.c_str());
        gst_object_unref(source_pad);
    }
    gst_object_unref(source);
    gst_object_unref(pipeline);
}

static void client_connected(GstRTSPServer *, GstRTSPClient *client) {
    GstRTSPConnection *connection = gst_rtsp_client_get_connection(client);
    g_print(" * Client connected: %s\n", gst_rtsp_connection_get_ip(connection));
}

int main(int argc, char *argv[]) {
    GError *error = NULL;
    GOptionContext *options =
        g_option_context_new("PIPELINE-DESCRIPTION - ZED RTSP Server, Launch");
    g_option_context_add_main_entries(options, entries, NULL);
    g_option_context_add_group(options, gst_init_get_option_group());
    if (!g_option_context_parse(options, &argc, &argv, &error)) {
        g_printerr("Error parsing options: %s\n", error->message);
        g_option_context_free(options);
        g_clear_error(&error);
        return EXIT_FAILURE;
    }
    g_option_context_free(options);

    if (!load_trigger_config(trigger_config_path)) {
        return EXIT_FAILURE;
    }

    gchar **args;
#ifdef G_OS_WIN32
    args = g_win32_get_command_line();
#else
    args = g_strdupv(argv);
#endif

    gchar **pipeline_argv = g_new0(char *, argc);
    memcpy(pipeline_argv, args + 1, sizeof(char *) * (argc - 1));
    GstElement *validation_pipeline =
        GST_ELEMENT(gst_parse_launchv((const gchar **) pipeline_argv, &error));
    g_free(pipeline_argv);
    if (!validation_pipeline || error) {
        g_printerr("ERROR - pipeline could not be constructed: %s\n",
                   error ? error->message : "unknown error");
        g_clear_error(&error);
        return EXIT_FAILURE;
    }
    GstElement *payload = gst_bin_get_by_name(GST_BIN(validation_pipeline), "pay0");
    if (!payload) {
        g_printerr("ERROR - a payload named pay0 must be present in the pipeline\n");
        gst_object_unref(validation_pipeline);
        return EXIT_FAILURE;
    }
    g_object_unref(payload);
    gst_object_unref(validation_pipeline);

    std::string rtsp_pipeline = "( ";
    for (int index = 1; index < argc; ++index) {
        rtsp_pipeline += argv[index];
        rtsp_pipeline += ' ';
    }
    rtsp_pipeline += ')';

    GMainLoop *loop = g_main_loop_new(NULL, FALSE);
    GstRTSPServer *server = gst_rtsp_server_new();
    g_object_set(server, "address", host, "service", port, NULL);
    GstRTSPMountPoints *mounts = gst_rtsp_server_get_mount_points(server);
    GstRTSPMediaFactory *factory = gst_rtsp_media_factory_new();
    gst_rtsp_media_factory_set_launch(factory, rtsp_pipeline.c_str());
    gst_rtsp_media_factory_set_shared(factory, TRUE);
    g_signal_connect(factory, "media-configure", G_CALLBACK(media_configure), NULL);
    gst_rtsp_mount_points_add_factory(mounts, "/zed_stream", factory);
    g_object_unref(mounts);
    gst_rtsp_server_attach(server, NULL);
    g_signal_connect(server, "client-connected", G_CALLBACK(client_connected), NULL);

    g_print(" ZED RTSP Server\n-----------------\n");
    g_print(" * Stream ready at rtsp://%s:%s/zed_stream\n", host, port);
    if (trigger_config.enabled) {
        g_print(" * Vehicle trigger observer enabled in %s mode\n",
                trigger_config.shadow_mode ? "SHADOW" : "ACTIVE");
    }
    g_main_loop_run(loop);
    return EXIT_SUCCESS;
}
