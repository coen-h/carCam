#pragma once

#include <gst/gst.h>

#include "sl/Camera.hpp"

// The trigger is opt-in. When ZED_DEPTH_TRIGGER_CONFIG is unset, create()
// returns nullptr and the stock source path is unchanged.
gpointer zed_depth_trigger_create_from_environment(GstElement *owner);
void zed_depth_trigger_destroy(gpointer trigger);
gboolean zed_depth_trigger_should_sample(gpointer trigger);
void zed_depth_trigger_sample(gpointer trigger, sl::Camera &camera);
