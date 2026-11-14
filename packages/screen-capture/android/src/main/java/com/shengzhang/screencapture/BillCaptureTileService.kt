package com.shengzhang.screencapture

import android.content.Intent
import android.app.PendingIntent
import android.net.Uri
import android.os.Build
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService

class BillCaptureTileService : TileService() {
  override fun onTileAdded() {
    super.onTileAdded()
    TilePresenceStore.observe(this, TilePresenceSignal.ADDED)
  }

  override fun onTileRemoved() {
    TilePresenceStore.observe(this, TilePresenceSignal.REMOVED)
    super.onTileRemoved()
  }

  override fun onStartListening() {
    super.onStartListening()
    TilePresenceStore.observe(this, TilePresenceSignal.LISTENING)
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
    TilePresenceStore.observe(this, TilePresenceSignal.CLICKED)
    val captureService = BillCaptureAccessibilityService.instance
    val intent = if (captureService == null) {
      Intent(
        Intent.ACTION_VIEW,
        Uri.parse("shengzhang://screen-capture-settings")
      ).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
      }
    } else CaptureShortcuts.captureIntent(this)

    // Let SystemUI own the collapse animation. Calling the accessibility
    // service directly leaves quick settings expanded on some OEM systems.
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      startActivityAndCollapse(PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
    } else {
      @Suppress("DEPRECATION")
      startActivityAndCollapse(intent)
    }
  }
}
