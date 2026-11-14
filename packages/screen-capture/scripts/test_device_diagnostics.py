import json
import unittest

from device_diagnostics import (
    accessibility_windows,
    device_states,
    focus_source,
    installed_version,
    service_enabled,
)


class DeviceDiagnosticsTest(unittest.TestCase):
    def test_device_inventory_does_not_retain_serials(self):
        output = "List of devices attached\nprivate-id device product:example\nother-id unauthorized\n"
        self.assertEqual(device_states(output), ["device", "unauthorized"])
        self.assertNotIn("private-id", json.dumps(device_states(output)))

    def test_windows_keep_structural_fields_and_discard_titles_and_bounds(self):
        output = """AccessibilityWindowInfo[id=12, type=TYPE_APPLICATION, layer=0, bounds=Rect(0, 0 - 720, 1600), focused=true, active=true, title=PRIVATE_BILL]
AccessibilityWindowInfo[id=15, type=TYPE_SYSTEM, layer=3, focused=false, active=false, title=PRIVATE_NOTIFICATION]"""
        self.assertEqual(accessibility_windows(output), [
            {"id": 12, "type": "TYPE_APPLICATION", "focused": True, "active": True},
            {"id": 15, "type": "TYPE_SYSTEM", "focused": False, "active": False},
        ])
        self.assertNotIn("PRIVATE", json.dumps(accessibility_windows(output)))

    def test_unknown_dump_format_remains_unknown(self):
        self.assertEqual(accessibility_windows("Vendor window dump unavailable"), [])
        self.assertIsNone(focus_source("No readable current focus"))
        self.assertIsNone(installed_version("Package not found"))

    def test_modern_windows_include_a_display_id_before_the_window_type(self):
        output = "AccessibilityWindowInfo[id=9, displayId=0, type=TYPE_APPLICATION, layer=1, focused=true, active=false, title=private]"
        self.assertEqual(accessibility_windows(output), [
            {"id": 9, "type": "TYPE_APPLICATION", "focused": True, "active": False},
        ])

    def test_hyperos_windows_can_put_display_id_before_window_id(self):
        output = "AccessibilityWindowInfo[displayId=0, id=18, type=TYPE_APPLICATION, layer=0, focused=true, active=true, title=PRIVATE]"
        self.assertEqual(accessibility_windows(output), [
            {"id": 18, "type": "TYPE_APPLICATION", "focused": True, "active": True},
        ])

    def test_window_title_cannot_supply_missing_structural_flags(self):
        output = "AccessibilityWindowInfo[id=12, type=TYPE_APPLICATION, title=private, focused=true, active=true]"
        self.assertEqual(accessibility_windows(output), [
            {"id": 12, "type": "TYPE_APPLICATION", "focused": None, "active": None},
        ])

    def test_current_focus_only_exposes_allowlisted_source_labels(self):
        self.assertEqual(focus_source("mCurrentFocus=Window{abc u0 com.tencent.mm/.PrivateActivity}"), "wechat")
        self.assertEqual(focus_source("mCurrentFocus=Window{abc u0 com.eg.android.AlipayGphone/.PrivateActivity}"), "alipay")
        self.assertEqual(focus_source("mCurrentFocus=Window{abc u0 private.other.app/.PrivateActivity}"), "other")
        self.assertIsNone(focus_source("mCurrentFocus=null"))

    def test_version_parser_ignores_other_package_metadata(self):
        output = "versionCode=24 minSdk=30 targetSdk=36\nversionName=0.3.3\nprivateToken=never-export"
        self.assertEqual(installed_version(output), {"name": "0.3.3", "code": 24})

    def test_permission_setting_is_not_treated_as_connected_service(self):
        component = "com.shengzhang.ledger/com.shengzhang.screencapture.BillCaptureAccessibilityService"
        self.assertTrue(service_enabled(component + ":private.app/.OtherService"))
        self.assertFalse(service_enabled("private.app/.OtherService"))
        self.assertFalse(service_enabled("null"))


if __name__ == "__main__":
    unittest.main()
