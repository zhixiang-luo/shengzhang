package com.shengzhang.screencapture

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService

class BillCaptureTileService : TileService() {
  override fun onStartListening() {
    super.onStartListening()
    qsTile?.apply {
      label = getString(R.string.screen_capture_tile_label)
      state = Tile.STATE_INACTIVE
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        subtitle = if (BillCaptureAccessibilityService.instance == null) {
          "请先开启识别服务"
        } else {
          "读取当前付款页"
        }
      }
      updateTile()
    }
  }

  override fun onClick() {
    super.onClick()
    val captureService = BillCaptureAccessibilityService.instance
    if (captureService == null) {
      val intent = Intent(
        Intent.ACTION_VIEW,
        Uri.parse("shengzhang://screen-capture-settings")
      ).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
      }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
        startActivityAndCollapse(intent)
      } else {
        @Suppress("DEPRECATION")
        startActivityAndCollapse(intent)
      }
      return
    }

    captureService.beginCapture()
  }
}
