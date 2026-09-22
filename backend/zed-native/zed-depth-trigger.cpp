#include "zed-depth-trigger.h"

#include <glib/gstdio.h>

#include <algorithm>
#include <chrono>
#include <cmath>
#include <cstdint>
#include <cstdio>
#include <cstring>
#include <ctime>
#include <fstream>
#include <iomanip>
#include <limits>
#include <sstream>
#include <string>
#include <vector>

namespace {

using Clock = std::chrono::steady_clock;

struct Point {
    int x = 0;
    int y = 0;
};

enum class Phase {
    NEEDS_CALIBRATION,
    CALIBRATING,
    WARMING_UP,
    CLEAR,
    POSSIBLE,
    OCCUPIED,
    HOLD,
    DEPTH_UNRELIABLE,
    CAMERA_MOVED
};

const char *phase_name(Phase phase) {
    switch (phase) {
    case Phase::NEEDS_CALIBRATION: return "needs_calibration";
    case Phase::CALIBRATING: return "calibrating";
    case Phase::WARMING_UP: return "warming_up";
    case Phase::CLEAR: return "clear";
    case Phase::POSSIBLE: return "possible";
    case Phase::OCCUPIED: return "occupied";
    case Phase::HOLD: return "hold";
    case Phase::DEPTH_UNRELIABLE: return "depth_unreliable";
    case Phase::CAMERA_MOVED: return "camera_moved";
    }
    return "unknown";
}

struct Config {
    int width = 160;
    int height = 90;
    int interval_ms = 250;
    int calibration_seconds = 30;
    int startup_settle_seconds = 15;
    std::vector<Point> roi_polygon;
    std::vector<std::vector<Point>> exclusion_polygons;
    float min_depth_mm = 500.0F;
    float max_depth_mm = 12000.0F;
    float min_closer_mm = 500.0F;
    int min_changed_pixels = 150;
    double min_changed_fraction = 0.04;
    int confirm_samples = 2;
    int clear_samples = 3;
    int hold_seconds = 10;
    double min_valid_fraction = 0.30;
    int unreliable_confirm_samples = 8;
    float movement_delta_mm = 750.0F;
    double movement_fraction = 0.45;
    double movement_bidirectional_fraction = 0.08;
    int movement_confirm_samples = 20;
    bool shadow_mode = true;
    bool auto_calibrate_if_missing = false;
    std::string state_path;
    std::string baseline_path;
    std::string calibration_request_path;
    std::string event_path;
    int event_max_bytes = 5 * 1024 * 1024;
    int event_backups = 3;
};

struct Trigger {
    Config config;
    GstElement *owner = nullptr;
    sl::Mat depth;
    std::vector<uint8_t> mask;
    int masked_pixels = 0;
    uint32_t mask_hash = 0;
    std::vector<float> baseline;
    std::vector<uint8_t> baseline_valid;
    int baseline_valid_pixels = 0;
    bool baseline_loaded = false;
    std::vector<float> calibration_values;
    int calibration_target_samples = 0;
    int calibration_samples = 0;
    Clock::time_point started_at = Clock::now();
    Clock::time_point last_sample_at{};
    Clock::time_point settle_until{};
    Clock::time_point hold_until{};
    Clock::time_point event_started_at{};
    uint64_t sample_count = 0;
    int changed_pixels = 0;
    int farther_pixels = 0;
    int movement_pixels = 0;
    int comparable_pixels = 0;
    double changed_fraction = 0.0;
    double farther_fraction = 0.0;
    double movement_changed_fraction = 0.0;
    double valid_fraction = 0.0;
    int peak_changed_pixels = 0;
    double peak_changed_fraction = 0.0;
    int occupied_streak = 0;
    int clear_streak = 0;
    int unreliable_streak = 0;
    int recovery_streak = 0;
    int movement_streak = 0;
    int retrieve_error_streak = 0;
    bool event_active = false;
    Phase phase = Phase::NEEDS_CALIBRATION;
    std::string last_error;
};

bool read_integer(GKeyFile *file, const char *key, int &value, std::string &error) {
    GError *gerror = nullptr;
    const gint parsed = g_key_file_get_integer(file, "depth-trigger", key, &gerror);
    if (gerror != nullptr) {
        error = gerror->message;
        g_error_free(gerror);
        return false;
    }
    value = parsed;
    return true;
}

bool read_double(GKeyFile *file, const char *key, double &value, std::string &error) {
    GError *gerror = nullptr;
    const gdouble parsed = g_key_file_get_double(file, "depth-trigger", key, &gerror);
    if (gerror != nullptr) {
        error = gerror->message;
        g_error_free(gerror);
        return false;
    }
    value = parsed;
    return true;
}

bool read_boolean(GKeyFile *file, const char *key, bool &value, std::string &error) {
    GError *gerror = nullptr;
    const gboolean parsed = g_key_file_get_boolean(file, "depth-trigger", key, &gerror);
    if (gerror != nullptr) {
        error = gerror->message;
        g_error_free(gerror);
        return false;
    }
    value = parsed == TRUE;
    return true;
}

bool read_string(GKeyFile *file, const char *key, std::string &value, std::string &error) {
    GError *gerror = nullptr;
    gchar *parsed = g_key_file_get_string(file, "depth-trigger", key, &gerror);
    if (gerror != nullptr) {
        error = gerror->message;
        g_error_free(gerror);
        return false;
    }
    value = parsed != nullptr ? parsed : "";
    g_free(parsed);
    return true;
}

bool parse_point(const std::string &text, Point &point) {
    const size_t comma = text.find(',');
    if (comma == std::string::npos) {
        return false;
    }
    try {
        size_t x_end = 0;
        size_t y_end = 0;
        point.x = std::stoi(text.substr(0, comma), &x_end);
        point.y = std::stoi(text.substr(comma + 1), &y_end);
        return x_end == comma && y_end == text.size() - comma - 1;
    } catch (...) {
        return false;
    }
}

bool parse_polygon(const std::string &text, std::vector<Point> &polygon) {
    polygon.clear();
    std::stringstream stream(text);
    std::string token;
    while (std::getline(stream, token, ';')) {
        Point point;
        if (!parse_point(token, point)) {
            return false;
        }
        polygon.push_back(point);
    }
    return polygon.size() >= 3;
}

bool parse_exclusions(const std::string &text,
                      std::vector<std::vector<Point>> &polygons) {
    polygons.clear();
    if (text.empty()) {
        return true;
    }
    std::stringstream stream(text);
    std::string token;
    while (std::getline(stream, token, '|')) {
        std::vector<Point> polygon;
        if (!parse_polygon(token, polygon)) {
            return false;
        }
        polygons.push_back(polygon);
    }
    return true;
}

bool polygon_in_bounds(const std::vector<Point> &polygon, int width, int height) {
    for (const Point &point : polygon) {
        if (point.x < 0 || point.y < 0 || point.x > width || point.y > height) {
            return false;
        }
    }
    return true;
}

bool point_in_polygon(double x, double y, const std::vector<Point> &polygon) {
    bool inside = false;
    for (size_t i = 0, j = polygon.size() - 1; i < polygon.size(); j = i++) {
        const Point &a = polygon[i];
        const Point &b = polygon[j];
        const bool crosses = ((a.y > y) != (b.y > y)) &&
            (x < (static_cast<double>(b.x - a.x) * (y - a.y) /
                  static_cast<double>(b.y - a.y) + a.x));
        if (crosses) {
            inside = !inside;
        }
    }
    return inside;
}

bool load_config(const char *path, Config &config, std::string &error) {
    GKeyFile *file = g_key_file_new();
    GError *gerror = nullptr;
    if (!g_key_file_load_from_file(file, path, G_KEY_FILE_NONE, &gerror)) {
        error = gerror != nullptr ? gerror->message : "unable to read config";
        if (gerror != nullptr) {
            g_error_free(gerror);
        }
        g_key_file_unref(file);
        return false;
    }

    std::string roi_text;
    std::string exclusion_text;
    bool ok = read_integer(file, "sample-width", config.width, error) &&
              read_integer(file, "sample-height", config.height, error) &&
              read_integer(file, "sample-interval-ms", config.interval_ms, error) &&
              read_integer(file, "calibration-seconds", config.calibration_seconds, error) &&
              read_integer(file, "startup-settle-seconds",
                           config.startup_settle_seconds, error) &&
              read_string(file, "roi-polygon", roi_text, error) &&
              read_string(file, "exclude-polygons", exclusion_text, error);

    double number = 0.0;
    if (ok && read_double(file, "min-depth-mm", number, error)) {
        config.min_depth_mm = static_cast<float>(number);
    } else {
        ok = false;
    }
    if (ok && read_double(file, "max-depth-mm", number, error)) {
        config.max_depth_mm = static_cast<float>(number);
    } else {
        ok = false;
    }
    if (ok && read_double(file, "min-closer-mm", number, error)) {
        config.min_closer_mm = static_cast<float>(number);
    } else {
        ok = false;
    }
    ok = ok && read_integer(file, "min-changed-pixels", config.min_changed_pixels, error);
    if (ok && read_double(file, "min-changed-fraction", number, error)) {
        config.min_changed_fraction = number;
    } else {
        ok = false;
    }
    ok = ok && read_integer(file, "confirm-samples", config.confirm_samples, error) &&
         read_integer(file, "clear-samples", config.clear_samples, error) &&
         read_integer(file, "hold-seconds", config.hold_seconds, error);
    if (ok && read_double(file, "min-valid-fraction", number, error)) {
        config.min_valid_fraction = number;
    } else {
        ok = false;
    }
    ok = ok && read_integer(file, "unreliable-confirm-samples",
                            config.unreliable_confirm_samples, error);
    if (ok && read_double(file, "movement-delta-mm", number, error)) {
        config.movement_delta_mm = static_cast<float>(number);
    } else {
        ok = false;
    }
    if (ok && read_double(file, "movement-fraction", number, error)) {
        config.movement_fraction = number;
    } else {
        ok = false;
    }
    if (ok && read_double(file, "movement-bidirectional-fraction", number, error)) {
        config.movement_bidirectional_fraction = number;
    } else {
        ok = false;
    }
    ok = ok && read_integer(file, "movement-confirm-samples",
                            config.movement_confirm_samples, error) &&
         read_boolean(file, "shadow-mode", config.shadow_mode, error) &&
         read_boolean(file, "auto-calibrate-if-missing", config.auto_calibrate_if_missing,
                      error) &&
         read_string(file, "state-path", config.state_path, error) &&
         read_string(file, "baseline-path", config.baseline_path, error) &&
         read_string(file, "calibration-request-path", config.calibration_request_path,
                     error) &&
         read_string(file, "event-path", config.event_path, error) &&
         read_integer(file, "event-max-bytes", config.event_max_bytes, error) &&
         read_integer(file, "event-backups", config.event_backups, error);
    g_key_file_unref(file);

    const char *interval_override = g_getenv("ZED_DEPTH_TRIGGER_INTERVAL_MS");
    if (ok && interval_override != nullptr && *interval_override != '\0') {
        try {
            config.interval_ms = std::stoi(interval_override);
        } catch (...) {
            error = "invalid ZED_DEPTH_TRIGGER_INTERVAL_MS";
            ok = false;
        }
    }

    if (ok && (!parse_polygon(roi_text, config.roi_polygon) ||
               !parse_exclusions(exclusion_text, config.exclusion_polygons))) {
        error = "invalid polygon configuration";
        ok = false;
    }
    if (ok && (!polygon_in_bounds(config.roi_polygon, config.width, config.height))) {
        error = "ROI polygon is outside the sample image";
        ok = false;
    }
    if (ok) {
        for (const auto &polygon : config.exclusion_polygons) {
            if (!polygon_in_bounds(polygon, config.width, config.height)) {
                error = "exclusion polygon is outside the sample image";
                ok = false;
                break;
            }
        }
    }
    if (ok && (config.width < 16 || config.height < 16 || config.interval_ms < 100 ||
               config.interval_ms > 5000 || config.calibration_seconds < 5 ||
               config.startup_settle_seconds < 0 ||
               config.startup_settle_seconds > 60 ||
               config.min_depth_mm < 0.0F || config.max_depth_mm <= config.min_depth_mm ||
               config.min_closer_mm <= 0.0F || config.min_changed_pixels < 1 ||
               config.min_changed_fraction <= 0.0 || config.min_changed_fraction > 1.0 ||
               config.confirm_samples < 1 || config.clear_samples < 1 ||
               config.hold_seconds < 0 || config.min_valid_fraction <= 0.0 ||
               config.min_valid_fraction > 1.0 || config.unreliable_confirm_samples < 1 ||
               config.movement_delta_mm <= 0.0F || config.movement_fraction <= 0.0 ||
               config.movement_fraction > 1.0 ||
               config.movement_bidirectional_fraction < 0.0 ||
               config.movement_bidirectional_fraction > 1.0 ||
               config.movement_confirm_samples < 1 || config.state_path.empty() ||
               config.baseline_path.empty() || config.calibration_request_path.empty() ||
               config.event_path.empty() || config.event_max_bytes < 1024 ||
               config.event_backups < 1 || config.event_backups > 10)) {
        error = "invalid depth-trigger configuration values";
        ok = false;
    }
    return ok;
}

std::string utc_timestamp() {
    const std::time_t now = std::time(nullptr);
    std::tm utc{};
    gmtime_r(&now, &utc);
    std::ostringstream stream;
    stream << std::put_time(&utc, "%Y-%m-%dT%H:%M:%SZ");
    return stream.str();
}

std::string json_escape(const std::string &input) {
    std::ostringstream output;
    for (const char c : input) {
        switch (c) {
        case '\\': output << "\\\\"; break;
        case '"': output << "\\\""; break;
        case '\n': output << "\\n"; break;
        case '\r': output << "\\r"; break;
        case '\t': output << "\\t"; break;
        default: output << c; break;
        }
    }
    return output.str();
}

uint32_t fnv1a(const uint8_t *data, size_t size, uint32_t hash = 2166136261U) {
    for (size_t i = 0; i < size; ++i) {
        hash ^= data[i];
        hash *= 16777619U;
    }
    return hash;
}

void build_mask(Trigger &trigger) {
    const Config &c = trigger.config;
    trigger.mask.assign(static_cast<size_t>(c.width) * c.height, 0);
    for (int y = 0; y < c.height; ++y) {
        for (int x = 0; x < c.width; ++x) {
            bool included = point_in_polygon(x + 0.5, y + 0.5, c.roi_polygon);
            if (included) {
                for (const auto &polygon : c.exclusion_polygons) {
                    if (point_in_polygon(x + 0.5, y + 0.5, polygon)) {
                        included = false;
                        break;
                    }
                }
            }
            const size_t index = static_cast<size_t>(y) * c.width + x;
            trigger.mask[index] = included ? 1 : 0;
            trigger.masked_pixels += included ? 1 : 0;
        }
    }
    trigger.mask_hash = fnv1a(trigger.mask.data(), trigger.mask.size());
    trigger.mask_hash = fnv1a(reinterpret_cast<const uint8_t *>(&c.width), sizeof(c.width),
                              trigger.mask_hash);
    trigger.mask_hash = fnv1a(reinterpret_cast<const uint8_t *>(&c.height), sizeof(c.height),
                              trigger.mask_hash);
    trigger.mask_hash = fnv1a(reinterpret_cast<const uint8_t *>(&c.min_depth_mm),
                              sizeof(c.min_depth_mm), trigger.mask_hash);
    trigger.mask_hash = fnv1a(reinterpret_cast<const uint8_t *>(&c.max_depth_mm),
                              sizeof(c.max_depth_mm), trigger.mask_hash);
}

template <typename T>
void append_binary(std::vector<char> &output, const T &value) {
    const char *bytes = reinterpret_cast<const char *>(&value);
    output.insert(output.end(), bytes, bytes + sizeof(T));
}

template <typename T>
bool read_binary(const char *data, size_t size, size_t &offset, T &value) {
    if (offset + sizeof(T) > size) {
        return false;
    }
    std::memcpy(&value, data + offset, sizeof(T));
    offset += sizeof(T);
    return true;
}

bool save_baseline(Trigger &trigger, std::string &error) {
    static const char magic[8] = {'Z', 'D', 'T', 'R', 'I', 'G', '2', '\0'};
    const uint32_t version = 2;
    const uint32_t width = static_cast<uint32_t>(trigger.config.width);
    const uint32_t height = static_cast<uint32_t>(trigger.config.height);
    const uint32_t count = static_cast<uint32_t>(trigger.baseline.size());
    std::vector<char> output;
    output.reserve(8 + 7 * sizeof(uint32_t) + count * (sizeof(float) + 1));
    output.insert(output.end(), magic, magic + sizeof(magic));
    append_binary(output, version);
    append_binary(output, width);
    append_binary(output, height);
    append_binary(output, trigger.mask_hash);
    append_binary(output, trigger.config.min_depth_mm);
    append_binary(output, trigger.config.max_depth_mm);
    append_binary(output, count);
    const char *baseline_bytes = reinterpret_cast<const char *>(trigger.baseline.data());
    output.insert(output.end(), baseline_bytes,
                  baseline_bytes + trigger.baseline.size() * sizeof(float));
    const char *valid_bytes = reinterpret_cast<const char *>(trigger.baseline_valid.data());
    output.insert(output.end(), valid_bytes, valid_bytes + trigger.baseline_valid.size());

    const std::string temporary = trigger.config.baseline_path + ".tmp";
    GError *gerror = nullptr;
    if (!g_file_set_contents(temporary.c_str(), output.data(), output.size(), &gerror)) {
        error = gerror != nullptr ? gerror->message : "unable to write baseline";
        if (gerror != nullptr) {
            g_error_free(gerror);
        }
        return false;
    }
    if (g_rename(temporary.c_str(), trigger.config.baseline_path.c_str()) != 0) {
        error = "unable to install baseline atomically";
        g_unlink(temporary.c_str());
        return false;
    }
    return true;
}

bool load_baseline(Trigger &trigger, std::string &error) {
    gchar *contents = nullptr;
    gsize size = 0;
    GError *gerror = nullptr;
    if (!g_file_get_contents(trigger.config.baseline_path.c_str(), &contents, &size, &gerror)) {
        error = gerror != nullptr ? gerror->message : "baseline not found";
        if (gerror != nullptr) {
            g_error_free(gerror);
        }
        return false;
    }
    static const char expected_magic[8] = {'Z', 'D', 'T', 'R', 'I', 'G', '2', '\0'};
    bool ok = size >= sizeof(expected_magic) &&
              std::memcmp(contents, expected_magic, sizeof(expected_magic)) == 0;
    size_t offset = sizeof(expected_magic);
    uint32_t version = 0;
    uint32_t width = 0;
    uint32_t height = 0;
    uint32_t mask_hash = 0;
    float min_depth = 0.0F;
    float max_depth = 0.0F;
    uint32_t count = 0;
    ok = ok && read_binary(contents, size, offset, version) &&
         read_binary(contents, size, offset, width) &&
         read_binary(contents, size, offset, height) &&
         read_binary(contents, size, offset, mask_hash) &&
         read_binary(contents, size, offset, min_depth) &&
         read_binary(contents, size, offset, max_depth) &&
         read_binary(contents, size, offset, count);
    const size_t pixel_count = static_cast<size_t>(trigger.config.width) * trigger.config.height;
    const size_t expected_size = offset + pixel_count * sizeof(float) + pixel_count;
    ok = ok && version == 2 && width == static_cast<uint32_t>(trigger.config.width) &&
         height == static_cast<uint32_t>(trigger.config.height) &&
         mask_hash == trigger.mask_hash && count == pixel_count && size == expected_size &&
         std::fabs(min_depth - trigger.config.min_depth_mm) < 0.01F &&
         std::fabs(max_depth - trigger.config.max_depth_mm) < 0.01F;
    if (!ok) {
        error = "baseline does not match the current camera sampling configuration";
        g_free(contents);
        return false;
    }
    std::memcpy(trigger.baseline.data(), contents + offset, pixel_count * sizeof(float));
    offset += pixel_count * sizeof(float);
    std::memcpy(trigger.baseline_valid.data(), contents + offset, pixel_count);
    g_free(contents);
    trigger.baseline_valid_pixels = 0;
    for (size_t index = 0; index < pixel_count; ++index) {
        if (trigger.mask[index] && trigger.baseline_valid[index]) {
            ++trigger.baseline_valid_pixels;
        }
    }
    if (trigger.baseline_valid_pixels <
        static_cast<int>(trigger.masked_pixels * trigger.config.min_valid_fraction)) {
        error = "saved baseline has insufficient valid depth in the configured ROI";
        return false;
    }
    trigger.baseline_loaded = true;
    return true;
}

void rotate_events(const Config &config) {
    GStatBuf stat_buffer{};
    if (g_stat(config.event_path.c_str(), &stat_buffer) != 0 ||
        stat_buffer.st_size < config.event_max_bytes) {
        return;
    }
    for (int index = config.event_backups; index >= 1; --index) {
        const std::string destination = config.event_path + "." + std::to_string(index);
        const std::string source = index == 1
            ? config.event_path
            : config.event_path + "." + std::to_string(index - 1);
        if (index == config.event_backups) {
            g_unlink(destination.c_str());
        }
        g_rename(source.c_str(), destination.c_str());
    }
}

void append_event(Trigger &trigger, const char *event_type) {
    rotate_events(trigger.config);
    double duration_seconds = 0.0;
    if (trigger.event_started_at.time_since_epoch().count() != 0) {
        duration_seconds = std::chrono::duration_cast<std::chrono::milliseconds>(
                               Clock::now() - trigger.event_started_at)
                               .count() / 1000.0;
    }
    std::ostringstream json;
    json << std::fixed << std::setprecision(4)
         << "{\"schema_version\":1,\"timestamp\":\"" << utc_timestamp()
         << "\",\"event\":\"" << event_type << "\",\"state\":\""
         << phase_name(trigger.phase) << "\",\"changed_pixels\":"
         << trigger.changed_pixels << ",\"changed_fraction\":"
         << trigger.changed_fraction << ",\"peak_changed_pixels\":"
         << trigger.peak_changed_pixels << ",\"peak_changed_fraction\":"
         << trigger.peak_changed_fraction << ",\"duration_seconds\":"
         << duration_seconds << ",\"shadow_mode\":"
         << (trigger.config.shadow_mode ? "true" : "false") << "}\n";
    std::ofstream output(trigger.config.event_path, std::ios::out | std::ios::app);
    if (!output) {
        trigger.last_error = "unable to append depth event history";
        return;
    }
    output << json.str();
}

std::string polygon_json(const std::vector<Point> &polygon) {
    std::ostringstream json;
    json << '[';
    for (size_t index = 0; index < polygon.size(); ++index) {
        if (index != 0) {
            json << ',';
        }
        json << '[' << polygon[index].x << ',' << polygon[index].y << ']';
    }
    json << ']';
    return json.str();
}

bool phase_is_occupied(Phase phase) {
    return phase == Phase::OCCUPIED || phase == Phase::HOLD ||
           phase == Phase::DEPTH_UNRELIABLE || phase == Phase::CAMERA_MOVED;
}

void write_state(Trigger &trigger) {
    const Config &c = trigger.config;
    const double calibration_progress = trigger.baseline_loaded
        ? 1.0
        : (trigger.calibration_target_samples > 0
               ? static_cast<double>(trigger.calibration_samples) /
                     trigger.calibration_target_samples
               : 0.0);
    const double settle_remaining = trigger.phase == Phase::WARMING_UP
        ? std::max<int64_t>(0, std::chrono::duration_cast<std::chrono::milliseconds>(
                                   trigger.settle_until - Clock::now()).count()) / 1000.0
        : 0.0;
    const double hold_remaining = trigger.phase == Phase::HOLD
        ? std::max<int64_t>(0, std::chrono::duration_cast<std::chrono::milliseconds>(
                                   trigger.hold_until - Clock::now()).count()) / 1000.0
        : 0.0;
    const bool occupied = phase_is_occupied(trigger.phase);
    std::ostringstream baseline_id;
    baseline_id << std::hex << std::setfill('0') << std::setw(8) << trigger.mask_hash;
    std::ostringstream json;
    json << std::fixed << std::setprecision(4)
         << "{\n"
         << "  \"schema_version\": 2,\n"
         << "  \"updated_at\": \"" << utc_timestamp() << "\",\n"
         << "  \"mode\": \"" << (c.shadow_mode ? "shadow" : "active") << "\",\n"
         << "  \"state\": \"" << phase_name(trigger.phase) << "\",\n"
         << "  \"occupied\": " << (occupied ? "true" : "false") << ",\n"
         << "  \"actionable\": " << ((!c.shadow_mode && occupied) ? "true" : "false") << ",\n"
         << "  \"baseline_loaded\": " << (trigger.baseline_loaded ? "true" : "false") << ",\n"
         << "  \"baseline_id\": \"" << baseline_id.str() << "\",\n"
         << "  \"calibration_progress\": " << calibration_progress << ",\n"
         << "  \"settle_remaining_seconds\": " << settle_remaining << ",\n"
         << "  \"hold_remaining_seconds\": " << hold_remaining << ",\n"
         << "  \"changed_pixels\": " << trigger.changed_pixels << ",\n"
         << "  \"farther_pixels\": " << trigger.farther_pixels << ",\n"
         << "  \"movement_pixels\": " << trigger.movement_pixels << ",\n"
         << "  \"comparable_pixels\": " << trigger.comparable_pixels << ",\n"
         << "  \"changed_fraction\": " << trigger.changed_fraction << ",\n"
         << "  \"farther_fraction\": " << trigger.farther_fraction << ",\n"
         << "  \"movement_fraction\": " << trigger.movement_changed_fraction << ",\n"
         << "  \"valid_fraction\": " << trigger.valid_fraction << ",\n"
         << "  \"peak_changed_pixels\": " << trigger.peak_changed_pixels << ",\n"
         << "  \"peak_changed_fraction\": " << trigger.peak_changed_fraction << ",\n"
         << "  \"masked_pixels\": " << trigger.masked_pixels << ",\n"
         << "  \"baseline_valid_pixels\": " << trigger.baseline_valid_pixels << ",\n"
         << "  \"samples\": " << trigger.sample_count << ",\n"
         << "  \"sample_interval_ms\": " << c.interval_ms << ",\n"
         << "  \"sample_size\": [" << c.width << ", " << c.height << "],\n"
         << "  \"roi_polygon\": " << polygon_json(c.roi_polygon) << ",\n"
         << "  \"excluded_polygon_count\": " << c.exclusion_polygons.size() << ",\n"
         << "  \"last_error\": \"" << json_escape(trigger.last_error) << "\"\n"
         << "}\n";

    GError *error = nullptr;
    if (!g_file_set_contents(c.state_path.c_str(), json.str().c_str(), -1, &error)) {
        GST_WARNING_OBJECT(trigger.owner, "Unable to write depth trigger state: %s",
                           error != nullptr ? error->message : "unknown error");
        if (error != nullptr) {
            g_error_free(error);
        }
    }
}

bool usable_depth(float value, const Config &config) {
    return std::isfinite(value) && value >= config.min_depth_mm &&
           value <= config.max_depth_mm;
}

void reset_detection(Trigger &trigger) {
    trigger.changed_pixels = 0;
    trigger.farther_pixels = 0;
    trigger.movement_pixels = 0;
    trigger.comparable_pixels = 0;
    trigger.changed_fraction = 0.0;
    trigger.farther_fraction = 0.0;
    trigger.movement_changed_fraction = 0.0;
    trigger.valid_fraction = 0.0;
    trigger.peak_changed_pixels = 0;
    trigger.peak_changed_fraction = 0.0;
    trigger.occupied_streak = 0;
    trigger.clear_streak = 0;
    trigger.unreliable_streak = 0;
    trigger.recovery_streak = 0;
    trigger.movement_streak = 0;
    trigger.retrieve_error_streak = 0;
    trigger.event_active = false;
    trigger.hold_until = Clock::time_point{};
    trigger.settle_until = Clock::time_point{};
    trigger.event_started_at = Clock::time_point{};
}

void begin_calibration(Trigger &trigger) {
    reset_detection(trigger);
    trigger.baseline_loaded = false;
    trigger.baseline_valid_pixels = 0;
    std::fill(trigger.baseline.begin(), trigger.baseline.end(), 0.0F);
    std::fill(trigger.baseline_valid.begin(), trigger.baseline_valid.end(), 0);
    trigger.calibration_target_samples = std::max(
        5, trigger.config.calibration_seconds * 1000 / trigger.config.interval_ms);
    trigger.calibration_samples = 0;
    trigger.calibration_values.assign(
        trigger.baseline.size() * static_cast<size_t>(trigger.calibration_target_samples),
        std::numeric_limits<float>::quiet_NaN());
    trigger.phase = Phase::CALIBRATING;
    trigger.last_error.clear();
    append_event(trigger, "calibration_started");
    GST_INFO_OBJECT(trigger.owner, "Depth calibration started: %d samples",
                    trigger.calibration_target_samples);
}

void finish_calibration(Trigger &trigger) {
    const int minimum_observations = std::max(
        3, static_cast<int>(std::ceil(trigger.calibration_target_samples * 0.60)));
    std::vector<float> values;
    values.reserve(trigger.calibration_target_samples);
    trigger.baseline_valid_pixels = 0;
    for (size_t index = 0; index < trigger.baseline.size(); ++index) {
        if (!trigger.mask[index]) {
            continue;
        }
        values.clear();
        const size_t base = index * trigger.calibration_target_samples;
        for (int sample = 0; sample < trigger.calibration_target_samples; ++sample) {
            const float value = trigger.calibration_values[base + sample];
            if (std::isfinite(value)) {
                values.push_back(value);
            }
        }
        if (static_cast<int>(values.size()) < minimum_observations) {
            continue;
        }
        const size_t middle = values.size() / 2;
        std::nth_element(values.begin(), values.begin() + middle, values.end());
        trigger.baseline[index] = values[middle];
        trigger.baseline_valid[index] = 1;
        ++trigger.baseline_valid_pixels;
    }
    std::vector<float>().swap(trigger.calibration_values);
    if (trigger.baseline_valid_pixels <
        static_cast<int>(trigger.masked_pixels * trigger.config.min_valid_fraction)) {
        trigger.phase = Phase::NEEDS_CALIBRATION;
        trigger.last_error = "calibration produced insufficient valid depth";
        append_event(trigger, "calibration_failed");
        return;
    }
    std::string error;
    if (!save_baseline(trigger, error)) {
        trigger.phase = Phase::NEEDS_CALIBRATION;
        trigger.last_error = error;
        append_event(trigger, "calibration_failed");
        return;
    }
    trigger.baseline_loaded = true;
    trigger.phase = Phase::CLEAR;
    trigger.last_error.clear();
    append_event(trigger, "calibration_completed");
    GST_INFO_OBJECT(trigger.owner, "Depth calibration complete: %d/%d valid pixels",
                    trigger.baseline_valid_pixels, trigger.masked_pixels);
}

void collect_calibration_sample(Trigger &trigger, const sl::float1 *depth, size_t stride) {
    const Config &c = trigger.config;
    for (int y = 0; y < c.height; ++y) {
        for (int x = 0; x < c.width; ++x) {
            const size_t index = static_cast<size_t>(y) * c.width + x;
            if (!trigger.mask[index]) {
                continue;
            }
            const float value = depth[static_cast<size_t>(y) * stride + x];
            if (usable_depth(value, c)) {
                const size_t destination = index * trigger.calibration_target_samples +
                                           trigger.calibration_samples;
                trigger.calibration_values[destination] = value;
            }
        }
    }
    ++trigger.calibration_samples;
    if (trigger.calibration_samples >= trigger.calibration_target_samples) {
        finish_calibration(trigger);
    }
}

void start_occupancy_event(Trigger &trigger) {
    if (trigger.event_active) {
        return;
    }
    trigger.event_active = true;
    trigger.event_started_at = Clock::now();
    trigger.peak_changed_pixels = trigger.changed_pixels;
    trigger.peak_changed_fraction = trigger.changed_fraction;
    append_event(trigger, "occupied_start");
}

void finish_occupancy_event(Trigger &trigger) {
    if (!trigger.event_active) {
        return;
    }
    append_event(trigger, "occupied_end");
    trigger.event_active = false;
    trigger.event_started_at = Clock::time_point{};
    trigger.peak_changed_pixels = 0;
    trigger.peak_changed_fraction = 0.0;
}

void process_detection(Trigger &trigger, const sl::float1 *depth, size_t stride) {
    const Config &c = trigger.config;
    trigger.changed_pixels = 0;
    trigger.farther_pixels = 0;
    trigger.movement_pixels = 0;
    trigger.comparable_pixels = 0;
    for (int y = 0; y < c.height; ++y) {
        for (int x = 0; x < c.width; ++x) {
            const size_t index = static_cast<size_t>(y) * c.width + x;
            if (!trigger.mask[index] || !trigger.baseline_valid[index]) {
                continue;
            }
            const float current = depth[static_cast<size_t>(y) * stride + x];
            if (!usable_depth(current, c)) {
                continue;
            }
            ++trigger.comparable_pixels;
            const float delta = trigger.baseline[index] - current;
            if (delta >= c.min_closer_mm) {
                ++trigger.changed_pixels;
            }
            if (-delta >= c.min_closer_mm) {
                ++trigger.farther_pixels;
            }
            if (std::fabs(delta) >= c.movement_delta_mm) {
                ++trigger.movement_pixels;
            }
        }
    }
    trigger.changed_fraction = trigger.comparable_pixels > 0
        ? static_cast<double>(trigger.changed_pixels) / trigger.comparable_pixels : 0.0;
    trigger.farther_fraction = trigger.comparable_pixels > 0
        ? static_cast<double>(trigger.farther_pixels) / trigger.comparable_pixels : 0.0;
    trigger.movement_changed_fraction = trigger.comparable_pixels > 0
        ? static_cast<double>(trigger.movement_pixels) / trigger.comparable_pixels : 0.0;
    trigger.valid_fraction = trigger.baseline_valid_pixels > 0
        ? static_cast<double>(trigger.comparable_pixels) / trigger.baseline_valid_pixels : 0.0;

    // The ZED depth map can take a few seconds to settle after the camera is
    // reopened. Continue publishing its metrics, but do not turn those startup
    // transients into occupancy events when reusing a persistent baseline.
    if (trigger.phase == Phase::WARMING_UP) {
        if (Clock::now() < trigger.settle_until) {
            trigger.occupied_streak = 0;
            trigger.clear_streak = 0;
            trigger.unreliable_streak = 0;
            trigger.recovery_streak = 0;
            trigger.movement_streak = 0;
            return;
        }
        trigger.phase = Phase::CLEAR;
        trigger.last_error.clear();
    }

    if (trigger.event_active) {
        trigger.peak_changed_pixels = std::max(trigger.peak_changed_pixels,
                                               trigger.changed_pixels);
        trigger.peak_changed_fraction = std::max(trigger.peak_changed_fraction,
                                                 trigger.changed_fraction);
    }

    const bool movement_candidate =
        trigger.movement_changed_fraction >= c.movement_fraction &&
        trigger.changed_fraction >= c.movement_bidirectional_fraction &&
        trigger.farther_fraction >= c.movement_bidirectional_fraction;
    trigger.movement_streak = movement_candidate ? trigger.movement_streak + 1 : 0;
    if (trigger.movement_streak >= c.movement_confirm_samples) {
        finish_occupancy_event(trigger);
        trigger.phase = Phase::CAMERA_MOVED;
        trigger.last_error = "broad bidirectional depth change suggests camera movement";
        append_event(trigger, "camera_moved");
        return;
    }

    const bool depth_reliable = trigger.valid_fraction >= c.min_valid_fraction;
    trigger.unreliable_streak = depth_reliable ? 0 : trigger.unreliable_streak + 1;
    if (trigger.unreliable_streak >= c.unreliable_confirm_samples) {
        const bool newly_unreliable = trigger.phase != Phase::DEPTH_UNRELIABLE;
        trigger.phase = Phase::DEPTH_UNRELIABLE;
        trigger.last_error = "insufficient comparable depth in the configured ROI";
        if (newly_unreliable) {
            append_event(trigger, "depth_unreliable");
        }
        return;
    }
    if (trigger.phase == Phase::DEPTH_UNRELIABLE) {
        if (++trigger.recovery_streak < c.clear_samples) {
            return;
        }
        trigger.recovery_streak = 0;
        trigger.phase = Phase::CLEAR;
        trigger.last_error.clear();
        append_event(trigger, "depth_recovered");
    }

    const bool present = trigger.changed_pixels >= c.min_changed_pixels &&
                         trigger.changed_fraction >= c.min_changed_fraction;
    const auto now = Clock::now();
    if (present) {
        trigger.clear_streak = 0;
        if (trigger.phase == Phase::HOLD) {
            trigger.phase = Phase::OCCUPIED;
            trigger.occupied_streak = c.confirm_samples;
            return;
        }
        ++trigger.occupied_streak;
        if (trigger.occupied_streak >= c.confirm_samples) {
            trigger.phase = Phase::OCCUPIED;
            start_occupancy_event(trigger);
        } else if (trigger.phase != Phase::OCCUPIED) {
            trigger.phase = Phase::POSSIBLE;
        }
        return;
    }

    trigger.occupied_streak = 0;
    if (trigger.phase == Phase::OCCUPIED) {
        if (++trigger.clear_streak >= c.clear_samples) {
            trigger.clear_streak = 0;
            if (c.hold_seconds > 0) {
                trigger.phase = Phase::HOLD;
                trigger.hold_until = now + std::chrono::seconds(c.hold_seconds);
            } else {
                trigger.phase = Phase::CLEAR;
                finish_occupancy_event(trigger);
            }
        }
        return;
    }
    if (trigger.phase == Phase::HOLD) {
        if (now >= trigger.hold_until) {
            trigger.phase = Phase::CLEAR;
            finish_occupancy_event(trigger);
        }
        return;
    }
    trigger.clear_streak = 0;
    trigger.phase = Phase::CLEAR;
}

} // namespace

gpointer zed_depth_trigger_create_from_environment(GstElement *owner) {
    const char *path = g_getenv("ZED_DEPTH_TRIGGER_CONFIG");
    if (path == nullptr || *path == '\0') {
        return nullptr;
    }

    Trigger *trigger = new Trigger();
    trigger->owner = owner;
    std::string error;
    if (!load_config(path, trigger->config, error)) {
        GST_ERROR_OBJECT(owner, "Depth trigger disabled: %s (%s)", error.c_str(), path);
        delete trigger;
        return nullptr;
    }
    build_mask(*trigger);
    if (trigger->masked_pixels < trigger->config.min_changed_pixels) {
        GST_ERROR_OBJECT(owner, "Depth trigger disabled: ROI mask is too small");
        delete trigger;
        return nullptr;
    }
    const size_t pixel_count = static_cast<size_t>(trigger->config.width) *
                               trigger->config.height;
    trigger->baseline.assign(pixel_count, 0.0F);
    trigger->baseline_valid.assign(pixel_count, 0);
    trigger->started_at = Clock::now();
    if (load_baseline(*trigger, error)) {
        if (trigger->config.startup_settle_seconds > 0) {
            trigger->phase = Phase::WARMING_UP;
            trigger->settle_until = Clock::now() +
                std::chrono::seconds(trigger->config.startup_settle_seconds);
        } else {
            trigger->phase = Phase::CLEAR;
        }
        trigger->last_error.clear();
    } else if (trigger->config.auto_calibrate_if_missing) {
        begin_calibration(*trigger);
    } else {
        trigger->phase = Phase::NEEDS_CALIBRATION;
        trigger->last_error = error;
    }
    GST_INFO_OBJECT(owner,
                    "Depth trigger %s: %dx%d every %d ms, %d masked pixels, state=%s",
                    trigger->config.shadow_mode ? "shadow" : "active", trigger->config.width,
                    trigger->config.height, trigger->config.interval_ms,
                    trigger->masked_pixels, phase_name(trigger->phase));
    write_state(*trigger);
    return trigger;
}

void zed_depth_trigger_destroy(gpointer opaque) {
    delete static_cast<Trigger *>(opaque);
}

gboolean zed_depth_trigger_should_sample(gpointer opaque) {
    Trigger *trigger = static_cast<Trigger *>(opaque);
    if (trigger == nullptr) {
        return FALSE;
    }
    const auto now = Clock::now();
    if (trigger->last_sample_at.time_since_epoch().count() != 0 &&
        std::chrono::duration_cast<std::chrono::milliseconds>(
            now - trigger->last_sample_at).count() < trigger->config.interval_ms) {
        return FALSE;
    }
    trigger->last_sample_at = now;
    return TRUE;
}

void zed_depth_trigger_sample(gpointer opaque, sl::Camera &camera) {
    Trigger *trigger = static_cast<Trigger *>(opaque);
    if (trigger == nullptr) {
        return;
    }
    ++trigger->sample_count;

    if (g_file_test(trigger->config.calibration_request_path.c_str(), G_FILE_TEST_EXISTS)) {
        g_unlink(trigger->config.calibration_request_path.c_str());
        begin_calibration(*trigger);
    }

    const Config &c = trigger->config;
    const sl::ERROR_CODE result = camera.retrieveMeasure(
        trigger->depth, sl::MEASURE::DEPTH, sl::MEM::CPU,
        sl::Resolution(c.width, c.height));
    if (result != sl::ERROR_CODE::SUCCESS) {
        trigger->last_error = sl::toString(result).c_str();
        if (++trigger->retrieve_error_streak >= c.unreliable_confirm_samples) {
            trigger->phase = Phase::DEPTH_UNRELIABLE;
        }
        write_state(*trigger);
        return;
    }
    trigger->retrieve_error_streak = 0;
    if (trigger->phase != Phase::CAMERA_MOVED &&
        trigger->phase != Phase::NEEDS_CALIBRATION) {
        trigger->last_error.clear();
    }

    const sl::float1 *depth = trigger->depth.getPtr<sl::float1>(sl::MEM::CPU);
    const size_t stride = trigger->depth.getStepBytes(sl::MEM::CPU) /
                          sizeof(sl::float1);
    if (trigger->phase == Phase::CALIBRATING) {
        collect_calibration_sample(*trigger, depth, stride);
    } else if (trigger->baseline_loaded && trigger->phase != Phase::CAMERA_MOVED) {
        process_detection(*trigger, depth, stride);
    }
    write_state(*trigger);
}
