package com.shengzhang.windowprobe;

import android.accessibilityservice.AccessibilityService;
import android.graphics.Bitmap;
import android.hardware.HardwareBuffer;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.util.Log;
import android.view.Display;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import android.view.accessibility.AccessibilityWindowInfo;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Disposable metadata-only probe. It never stores screenshots, reads node text,
 * writes bill data, or performs network requests.
 */
public final class WindowProbeService extends AccessibilityService {
  public static final String TAG = "SZWindowProbe";
  public static volatile WindowProbeService instance;
  private final Handler handler = new Handler(Looper.getMainLooper());
  private final Map<Integer, String> sources = new HashMap<>();
  private final AtomicLong revision = new AtomicLong();
  private long stopAt;
  private String previous;
  private int lastSelectedId = -1;
  private String lastSelectedSource;

  @Override protected void onServiceConnected() {
    super.onServiceConnected();
    instance = this;
    Log.i(TAG, "{\"event\":\"service_connected\",\"flags\":" + getServiceInfo().flags +
      ",\"capabilities\":" + getServiceInfo().getCapabilities() + "}");
  }

  private static String label(String value) {
    if (value == null || value.length() == 0) return "none";
    switch (value) {
      case "com.tencent.mm": return "wechat";
      case "com.eg.android.AlipayGphone": return "alipay";
      case "com.shengzhang.ledger": return "shengzhang";
      case "com.android.systemui": return "systemui";
      case "com.shengzhang.windowprobe": return "probe";
      default: return "other";
    }
  }

  private static String role(int type) {
    switch (type) {
      case AccessibilityWindowInfo.TYPE_APPLICATION: return "application";
      case AccessibilityWindowInfo.TYPE_SYSTEM: return "system";
      case AccessibilityWindowInfo.TYPE_INPUT_METHOD: return "input_method";
      case AccessibilityWindowInfo.TYPE_ACCESSIBILITY_OVERLAY: return "accessibility_overlay";
      default: return "other";
    }
  }

  @SuppressWarnings("deprecation")
  private static String rootPackage(AccessibilityNodeInfo root) {
    if (root == null) return null;
    try {
      return root.getPackageName() == null ? null : root.getPackageName().toString();
    } finally {
      root.recycle();
    }
  }

  @Override public void onAccessibilityEvent(AccessibilityEvent event) {
    if (event == null) return;
    final int type = event.getEventType();
    if (type != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED &&
        type != AccessibilityEvent.TYPE_WINDOWS_CHANGED) return;
    final int windowId = event.getWindowId();
    final String pkg = event.getPackageName() == null ? "" : event.getPackageName().toString();
    if (type == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
      if (windowId >= 0 && pkg.length() > 0) {
        sources.put(windowId, pkg);
        revision.incrementAndGet();
      }
    } else if ((event.getWindowChanges() & AccessibilityEvent.WINDOWS_CHANGE_REMOVED) != 0) {
      sources.remove(windowId);
      revision.incrementAndGet();
    }
    if (SystemClock.uptimeMillis() >= stopAt) return;
    // Fixed labels only: never log event text, descriptions or class names.
    try {
      Log.i(TAG, new JSONObject().put("event", "window_event")
        .put("type", type).put("windowId", windowId).put("source", label(pkg))
        .put("changes", type == AccessibilityEvent.TYPE_WINDOWS_CHANGED ? event.getWindowChanges() : 0)
        .toString());
    } catch (Exception ignored) {
    }
  }

  public void startProbe(int seconds, boolean dismissShade, boolean screenshot, boolean windowScreenshot) {
    handler.removeCallbacksAndMessages(null);
    stopAt = SystemClock.uptimeMillis() + seconds * 1000L;
    previous = null;
    lastSelectedId = -1;
    lastSelectedSource = null;
    boolean dismissed = dismissShade && Build.VERSION.SDK_INT >= 31 &&
      performGlobalAction(GLOBAL_ACTION_DISMISS_NOTIFICATION_SHADE);
    try {
      Log.i(TAG, new JSONObject().put("event", "probe_start")
        .put("seconds", seconds).put("flags", getServiceInfo().flags)
        .put("capabilities", getServiceInfo().getCapabilities())
        .put("dismissRequested", dismissShade).put("dismissAccepted", dismissed)
        .put("screenshotRequested", screenshot).put("windowScreenshotRequested", windowScreenshot)
        .toString());
    } catch (Exception ignored) {
    }
    sample();
    if (screenshot) handler.postDelayed(this::takeDisplayScreenshot, 1200);
    if (windowScreenshot) handler.postDelayed(this::takeSelectedWindowScreenshot, 1600);
  }

  private void sample() {
    if (instance != this || SystemClock.uptimeMillis() >= stopAt) {
      Log.i(TAG, "{\"event\":\"probe_finished\"}");
      return;
    }
    try {
      List<WindowRow> rows = new ArrayList<>();
      JSONArray windows = new JSONArray();
      for (AccessibilityWindowInfo window : getWindows()) {
        String pkg = null;
        boolean rootFailed = false;
        try {
          pkg = rootPackage(window.getRoot());
        } catch (Exception error) {
          rootFailed = true;
        }
        WindowRow row = new WindowRow(window.getId(), window.getType(), window.isActive(),
          window.isFocused(), window.getLayer(), pkg);
        rows.add(row);
        windows.put(new JSONObject().put("id", row.id).put("role", role(row.type))
          .put("active", row.active).put("focused", row.focused).put("layer", row.layer)
          .put("rootSource", label(pkg)).put("rootFailed", rootFailed));
      }
      AccessibilityNodeInfo activeRoot = null;
      String activeSource = null;
      int activeId = -1;
      boolean activeRootFailed = false;
      try {
        activeRoot = getRootInActiveWindow();
        if (activeRoot != null) {
          activeId = activeRoot.getWindowId();
          activeSource = rootPackage(activeRoot);
          activeRoot = null;
        }
      } catch (Exception error) {
        activeRootFailed = true;
      } finally {
        if (activeRoot != null) activeRoot.recycle();
      }
      Selection selection = select(rows, activeId, activeSource);
      if (selection.ready) {
        lastSelectedId = selection.id;
        lastSelectedSource = selection.source;
      } else {
        lastSelectedId = -1;
        lastSelectedSource = null;
      }
      JSONObject result = new JSONObject().put("event", "snapshot").put("windows", windows)
        .put("activeRootSource", label(activeSource)).put("activeRootId", activeId)
        .put("activeRootFailed", activeRootFailed).put("selection", selection.name)
        .put("selectedId", selection.id).put("selectedSource", label(selection.source));
      String safe = result.toString();
      if (!safe.equals(previous)) {
        Log.i(TAG, safe);
        previous = safe;
      }
    } catch (Exception error) {
      Log.i(TAG, "{\"event\":\"snapshot_failed\"}");
    }
    handler.postDelayed(this::sample, 120);
  }

  private Selection select(List<WindowRow> rows, int activeId, String activeSource) {
    for (WindowRow row : rows) {
      if (row.active || row.focused) {
        if (row.type == AccessibilityWindowInfo.TYPE_SYSTEM) return Selection.systemPanel();
      }
    }
    WindowRow current = null;
    for (WindowRow row : rows) {
      if (!(row.active || row.focused)) continue;
      if (row.type == AccessibilityWindowInfo.TYPE_INPUT_METHOD) continue;
      if (row.type == AccessibilityWindowInfo.TYPE_ACCESSIBILITY_OVERLAY &&
          "com.shengzhang.windowprobe".equals(row.rootPackage)) continue;
      if (row.type != AccessibilityWindowInfo.TYPE_APPLICATION) {
        return Selection.unconfirmed("overlay_or_unknown");
      }
      if (current == null || row.layer > current.layer ||
          (row.layer == current.layer && row.focused && !current.focused)) current = row;
    }
    if (current == null) return Selection.unconfirmed("no_application_window");
    String source = current.rootPackage;
    if (source == null && activeId == current.id) source = activeSource;
    if (source == null) source = sources.get(current.id);
    if ("com.tencent.mm".equals(source) || "com.eg.android.AlipayGphone".equals(source)) {
      return Selection.ready(current.id, source);
    }
    return Selection.other(source);
  }

  private void takeDisplayScreenshot() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
      Log.i(TAG, "{\"event\":\"display_screenshot\",\"ok\":false,\"reason\":\"api\"}");
      return;
    }
    try {
      takeScreenshot(Display.DEFAULT_DISPLAY, getMainExecutor(),
        new TakeScreenshotCallback() {
          @Override public void onSuccess(ScreenshotResult screenshot) {
            HardwareBuffer buffer = screenshot.getHardwareBuffer();
            Bitmap bitmap = null;
            try {
              bitmap = Bitmap.wrapHardwareBuffer(buffer, screenshot.getColorSpace());
              Log.i(TAG, "{\"event\":\"display_screenshot\",\"ok\":true,\"width\":" +
                buffer.getWidth() + ",\"height\":" + buffer.getHeight() +
                ",\"bitmap\":" + (bitmap != null) + "}");
            } catch (Exception error) {
              Log.i(TAG, "{\"event\":\"display_screenshot\",\"ok\":false,\"reason\":\"decode\"}");
            } finally {
              if (bitmap != null) bitmap.recycle();
              buffer.close();
            }
          }
          @Override public void onFailure(int errorCode) {
            Log.i(TAG, "{\"event\":\"display_screenshot\",\"ok\":false,\"errorCode\":" + errorCode + "}");
          }
        });
    } catch (Exception error) {
      Log.i(TAG, "{\"event\":\"display_screenshot\",\"ok\":false,\"reason\":\"exception\"}");
    }
  }

  private void takeSelectedWindowScreenshot() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      Log.i(TAG, "{\"event\":\"window_screenshot\",\"ok\":false,\"reason\":\"api\"}");
      return;
    }
    int id = lastSelectedId;
    if (id < 0) {
      Log.i(TAG, "{\"event\":\"window_screenshot\",\"ok\":false,\"reason\":\"no_selected_window\"}");
      return;
    }
    try {
      takeScreenshotOfWindow(id, getMainExecutor(), new TakeScreenshotCallback() {
        @Override public void onSuccess(ScreenshotResult screenshot) {
          HardwareBuffer buffer = screenshot.getHardwareBuffer();
          Log.i(TAG, "{\"event\":\"window_screenshot\",\"ok\":true,\"width\":" +
            buffer.getWidth() + ",\"height\":" + buffer.getHeight() + "}");
          buffer.close();
        }
        @Override public void onFailure(int errorCode) {
          Log.i(TAG, "{\"event\":\"window_screenshot\",\"ok\":false,\"errorCode\":" + errorCode + "}");
        }
      });
    } catch (Exception error) {
      Log.i(TAG, "{\"event\":\"window_screenshot\",\"ok\":false,\"reason\":\"exception\"}");
    }
  }

  @Override public void onInterrupt() {
    stopAt = 0;
    handler.removeCallbacksAndMessages(null);
  }

  @Override public void onDestroy() {
    stopAt = 0;
    handler.removeCallbacksAndMessages(null);
    if (instance == this) instance = null;
    super.onDestroy();
  }

  private static final class WindowRow {
    final int id;
    final int type;
    final boolean active;
    final boolean focused;
    final int layer;
    final String rootPackage;

    WindowRow(int id, int type, boolean active, boolean focused, int layer, String rootPackage) {
      this.id = id;
      this.type = type;
      this.active = active;
      this.focused = focused;
      this.layer = layer;
      this.rootPackage = rootPackage;
    }
  }

  private static final class Selection {
    final String name;
    final int id;
    final String source;
    final boolean ready;

    Selection(String name, int id, String source, boolean ready) {
      this.name = name;
      this.id = id;
      this.source = source;
      this.ready = ready;
    }

    static Selection ready(int id, String source) {
      return new Selection("ready", id, source, true);
    }

    static Selection systemPanel() {
      return new Selection("system_panel", -1, null, false);
    }

    static Selection other(String source) {
      return new Selection("other_payment_app", -1, source, false);
    }

    static Selection unconfirmed(String reason) {
      return new Selection("unconfirmed:" + reason, -1, null, false);
    }
  }
}
