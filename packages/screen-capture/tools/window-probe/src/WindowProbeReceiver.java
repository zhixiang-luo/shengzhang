package com.shengzhang.windowprobe;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public final class WindowProbeReceiver extends BroadcastReceiver {
  @Override public void onReceive(Context context, Intent intent) {
    if (!"com.shengzhang.windowprobe.SAMPLE".equals(intent.getAction())) return;
    WindowProbeService service = WindowProbeService.instance;
    if (service == null) {
      Log.i(WindowProbeService.TAG, "{\"event\":\"service_not_connected\"}");
      return;
    }
    int seconds = Math.max(1, Math.min(15, intent.getIntExtra("seconds", 6)));
    service.startProbe(seconds, intent.getBooleanExtra("dismiss", false),
      intent.getBooleanExtra("screenshot", false),
      intent.getBooleanExtra("windowScreenshot", false));
  }
}
