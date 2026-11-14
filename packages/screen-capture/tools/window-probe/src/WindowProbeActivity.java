package com.shengzhang.windowprobe;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.provider.Settings;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

public final class WindowProbeActivity extends Activity {
  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    LinearLayout layout = new LinearLayout(this);
    layout.setOrientation(LinearLayout.VERTICAL);
    int padding = Math.round(24 * getResources().getDisplayMetrics().density);
    layout.setPadding(padding, padding * 2, padding, padding);
    TextView text = new TextView(this);
    text.setText("声账窗口诊断 · 临时工具\n\n请在无障碍设置中手动启用“声账窗口诊断（临时）”，然后回到付款详情页。\n\n电脑主动请求后，只检查六秒窗口结构。不读取文字、不截图、不联网、不保存账单，不访问原声账数据。\n\n测试后可关闭服务并卸载这个独立工具。");
    text.setTextSize(18);
    layout.addView(text);
    Button settings = new Button(this);
    settings.setText("打开无障碍设置");
    settings.setOnClickListener(view -> startActivity(new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)));
    layout.addView(settings);
    setContentView(layout);
  }
}
