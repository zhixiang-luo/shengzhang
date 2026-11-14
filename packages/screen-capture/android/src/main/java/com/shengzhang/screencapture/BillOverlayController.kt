package com.shengzhang.screencapture

import android.content.Context
import android.graphics.Color
import android.graphics.Rect
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.text.InputFilter
import android.text.InputType
import android.text.TextUtils
import android.os.Build
import android.view.Gravity
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.view.WindowInsets
import android.view.inputmethod.InputMethodManager
import android.window.OnBackInvokedCallback
import android.window.OnBackInvokedDispatcher
import android.widget.Button
import android.widget.DatePicker
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.TimePicker
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter

/** Service-owned views: no Activity, React context, system alert permission, or second confirmation. */
class BillOverlayController(
  private val context: Context,
  private val onClose: () -> Unit,
  private val onRetry: () -> Unit,
  private val onSave: (OverlaySaveInput) -> Unit
) {
  private val windows = context.getSystemService(WindowManager::class.java)
  private var root: FrameLayout? = null
  private var params: WindowManager.LayoutParams? = null
  private var card: LinearLayout? = null
  private var task: OverlayTask? = null
  private var categories = emptyList<OverlayCategory>()
  private var draft = OverlayDraft()
  private val amount get() = draft.amount
  private val note get() = draft.note
  private val type get() = draft.type
  private val categoryId get() = draft.categoryId
  private val occurredAt get() = draft.occurredAt
  private val defaultTime get() = draft.defaultTime
  private var loading = false
  private var saving = false
  private var message: String? = null
  private var retryVisible = false
  private var editorShowing = false
  private var activeInput: FocusedEditText? = null
  private var imeInset = 0
  private var backDispatcher: OnBackInvokedDispatcher? = null
  private var backCallback: OnBackInvokedCallback? = null
  private val zone get() = ZoneId.systemDefault()

  fun showLoading(value: OverlayTask, available: List<OverlayCategory>) {
    task = value; categories = available
    draft = OverlayDraft(occurredAt = Instant.ofEpochMilli(value.createdAt).toString())
    loading = true; saving = false; message = "正在云端识别这张付款页…"; retryVisible = false
    attach(); render()
  }

  fun showResult(bill: OverlayCloudBill) {
    draft = OverlayBillRules.mergeCloud(draft, bill, categories)
    loading = false; message = bill.blockingReason ?: if (bill.amountMinor == null) {
      if (bill.amountIssue == "unverified") CaptureDiagnostic.ERROR_CLOUD_AMOUNT_UNVERIFIED.message
      else CaptureDiagnostic.ERROR_CLOUD_AMOUNT_NOT_READ.message
    } else null
    retryVisible = bill.amountMinor == null
    render()
  }

  fun showFailure(text: String) { loading = false; saving = false; message = text; retryVisible = true; render() }
  fun showSaving() { saving = true; message = "正在保存…"; render() }
  fun showSaveFailure(text: String) { saving = false; message = text; retryVisible = false; render() }
  fun showRetrying() { loading = true; message = "正在重新识别…"; retryVisible = false; render() }

  fun close() {
    activeInput?.cancelKeyboardRequest(); activeInput = null; editorShowing = false
    if (Build.VERSION.SDK_INT >= 33) backCallback?.let { callback ->
      runCatching { backDispatcher?.unregisterOnBackInvokedCallback(callback) }
    }
    backDispatcher = null; backCallback = null; imeInset = 0
    root?.let { view ->
      (context.getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager).hideSoftInputFromWindow(view.windowToken, 0)
      runCatching { windows.removeViewImmediate(view) }
    }
    root = null; card = null; params = null; task = null; draft = OverlayDraft(); categories = emptyList()
  }

  private fun attach() {
    if (root != null) return
    val container = object : FrameLayout(context) {
      override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (event.keyCode == KeyEvent.KEYCODE_BACK) {
          if (event.action == KeyEvent.ACTION_UP) goBack()
          return true
        }
        return super.dispatchKeyEvent(event)
      }
      override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        if (Build.VERSION.SDK_INT >= 33) post {
          if (!isAttachedToWindow || backCallback != null) return@post
          val dispatcher = findOnBackInvokedDispatcher() ?: return@post
          val callback = OnBackInvokedCallback { goBack() }
          runCatching {
            dispatcher.registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_OVERLAY, callback)
            backDispatcher = dispatcher; backCallback = callback
          }
        }
      }
      override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        resizeEditor()
      }
    }.apply {
      setBackgroundColor(0x33000000); setOnClickListener { if (!saving) onClose() }
      isFocusableInTouchMode = true
      importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_YES
      setOnApplyWindowInsetsListener { _, insets ->
        imeInset = if (Build.VERSION.SDK_INT >= 30) insets.getInsets(WindowInsets.Type.ime()).bottom else 0
        resizeEditor(); insets
      }
    }
    val panel = LinearLayout(context).apply {
      orientation = LinearLayout.VERTICAL; setPadding(dp(20), dp(12), dp(20), dp(20))
      background = background(SURFACE, 24); elevation = dp(12).toFloat(); setOnClickListener { }
    }
    val width = minOf(dp(320), context.resources.displayMetrics.widthPixels - dp(32))
    container.addView(panel, FrameLayout.LayoutParams(width, FrameLayout.LayoutParams.WRAP_CONTENT, Gravity.CENTER))
    val layout = WindowManager.LayoutParams(WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.MATCH_PARENT,
      WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
      WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
      android.graphics.PixelFormat.TRANSLUCENT).apply {
      gravity = Gravity.CENTER; softInputMode = WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE or WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_HIDDEN
      title = "声账快捷记账"
    }
    windows.addView(container, layout)
    root = container; card = panel; params = layout
    container.requestFocus()
  }

  private fun render() {
    val panel = card ?: return
    val layout = params ?: return
    editorShowing = false; activeInput?.cancelKeyboardRequest(); activeInput = null
    root?.let { (context.getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager).hideSoftInputFromWindow(it.windowToken, 0) }
    layout.softInputMode = WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE or WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_HIDDEN
    runCatching { windows.updateViewLayout(root, layout) }
    panel.layoutParams = (panel.layoutParams as FrameLayout.LayoutParams).apply {
      height = FrameLayout.LayoutParams.WRAP_CONTENT; gravity = Gravity.CENTER; topMargin = 0
    }
    panel.removeAllViews()
    val heading = LinearLayout(context).apply { gravity = Gravity.CENTER_VERTICAL }
    heading.addView(text("声账 · 记一笔", 14f, SECONDARY), LinearLayout.LayoutParams(0, dp(44), 1f))
    heading.addView(text("×", 26f, SECONDARY).apply {
      gravity = Gravity.CENTER; contentDescription = "关闭记账卡"; isEnabled = !saving
      setOnClickListener { if (!saving) onClose() }
    }, LinearLayout.LayoutParams(dp(44), dp(44)))
    panel.addView(heading)
    panel.addView(text(if (amount.isEmpty()) "待补金额" else "¥ $amount", if (amount.isEmpty()) 30f else 36f, INK).apply {
      typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL); setPadding(0, dp(4), 0, dp(12))
      minHeight = dp(68); contentDescription = "金额，点击修改"; isEnabled = !loading && !saving
      setOnClickListener { if (isEnabled) editText("金额（元）", amount, true) {
        draft = draft.copy(amount = it, edited = draft.edited + OverlayField.AMOUNT); message = null
      } }
    })
    panel.addView(field("内容", note.ifBlank { "补充商品或商户" }) { editText("商品或商户", note, false) {
      draft = draft.copy(note = it, edited = draft.edited + OverlayField.NOTE)
    } })
    panel.addView(field("时间", displayTime() + if (defaultTime) " · 默认当前" else "") { editTime() })
    val selected = categories.find { it.id == categoryId }
    val categoryText = (if (type == "income") "收入 · " else "支出 · ") + (selected?.name ?: "选择分类")
    panel.addView(field("分类", categoryText) { editCategories() })
    val displayedMessage = draft.blockingReason?.let { "$it，请关闭后手动记账" } ?: message
    displayedMessage?.let {
      panel.addView(text(it, 12f, if (loading || saving) SECONDARY else DANGER).apply {
        maxLines = 2; ellipsize = TextUtils.TruncateAt.END; setPadding(0, dp(8), 0, dp(4))
        accessibilityLiveRegion = View.ACCESSIBILITY_LIVE_REGION_POLITE
      })
    }
    if (retryVisible && !loading && !saving) panel.addView(text("重试识别", 13f, RED).apply {
      gravity = Gravity.CENTER; minHeight = dp(44); setOnClickListener { onRetry() }
    })
    val valid = !loading && !saving && OverlayBillRules.canSave(draft, categories)
    panel.addView(button(if (saving) "正在保存…" else "确定收好了", valid) {
      val current = task ?: return@button
      if (!OverlayBillRules.canSave(draft, categories)) return@button
      val cents = OverlayBillRules.parseAmount(amount) ?: return@button
      val category = categoryId ?: return@button
      onSave(OverlaySaveInput(current.captureId, type, cents, category, occurredAt, note))
    }, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(50)).apply { topMargin = dp(12) })
    root?.requestFocus()
  }

  private fun field(label: String, value: String, action: () -> Unit): View = LinearLayout(context).apply {
    gravity = Gravity.CENTER_VERTICAL; minimumHeight = dp(46)
    addView(text(label, 12f, SECONDARY), LinearLayout.LayoutParams(dp(40), dp(44)))
    addView(text(value, 14f, INK).apply { gravity = Gravity.CENTER_VERTICAL; maxLines = 1; ellipsize = TextUtils.TruncateAt.END }, LinearLayout.LayoutParams(0, dp(44), 1f))
    addView(text("›", 20f, SECONDARY).apply { gravity = Gravity.CENTER }, LinearLayout.LayoutParams(dp(20), dp(44)))
    isEnabled = !loading && !saving; setOnClickListener { if (isEnabled) action() }
  }

  private data class Editor(val body: LinearLayout, val footer: LinearLayout)

  private fun editor(title: String): Editor {
    activeInput?.cancelKeyboardRequest(); activeInput = null; editorShowing = true
    root?.let { (context.getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager).hideSoftInputFromWindow(it.windowToken, 0) }
    params?.let {
      it.flags = it.flags and WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE.inv()
      it.softInputMode = WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE or WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_HIDDEN
      windows.updateViewLayout(root, it)
    }
    val panel = requireNotNull(card); panel.removeAllViews()
    val header = LinearLayout(context).apply { gravity = Gravity.CENTER_VERTICAL }
    header.addView(text(title, 17f, INK), LinearLayout.LayoutParams(0, dp(48), 1f))
    header.addView(text("返回", 14f, RED).apply { gravity = Gravity.CENTER; setOnClickListener { render() } }, LinearLayout.LayoutParams(dp(48), dp(48)))
    panel.addView(header)
    val body = LinearLayout(context).apply { orientation = LinearLayout.VERTICAL }
    val scroll = ScrollView(context).apply { isFillViewport = false; addView(body) }
    panel.addView(scroll, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f))
    val footer = LinearLayout(context).apply { orientation = LinearLayout.VERTICAL }
    panel.addView(footer, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT))
    resizeEditor(); root?.requestFocus()
    return Editor(body, footer)
  }

  private fun editText(title: String, value: String, numeric: Boolean, apply: (String) -> Unit) {
    val editor = editor(title)
    val input = FocusedEditText().apply {
      setText(value); setTextColor(INK); textSize = if (numeric) 28f else 18f
      inputType = if (numeric) InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL else InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_CAP_SENTENCES
      filters = arrayOf(InputFilter.LengthFilter(if (numeric) 10 else 120))
      setSingleLine(numeric); setPadding(dp(8), dp(12), dp(8), dp(12))
      if (!numeric) maxLines = 4
    }
    activeInput = input
    editor.body.addView(input, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT))
    val error = text("", 12f, DANGER); editor.body.addView(error)
    editor.footer.addView(button("完成", true) {
      val changed = input.text.toString().trim()
      if (numeric && OverlayBillRules.parseAmount(changed) == null) { error.text = "请填写大于 0 的金额，最多两位小数"; return@button }
      apply(changed); render()
    })
    params?.let { it.softInputMode = WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE; windows.updateViewLayout(root, it) }
    input.requestFocus(); input.setSelection(input.text.length)
    input.requestKeyboardWhenReady()
  }

  private fun editTime() {
    val editor = editor("交易时间")
    val local = Instant.parse(occurredAt).atZone(zone)
    val date = DatePicker(context).apply {
      calendarViewShown = false; init(local.year, local.monthValue - 1, local.dayOfMonth, null)
    }
    val time = TimePicker(context).apply { setIs24HourView(true); hour = local.hour; minute = local.minute }
    editor.body.addView(date); editor.body.addView(time)
    editor.footer.addView(button("完成", true) {
      draft = draft.copy(occurredAt = LocalDateTime.of(date.year, date.month + 1, date.dayOfMonth, time.hour, time.minute).atZone(zone).toInstant().toString(),
        defaultTime = false, edited = draft.edited + OverlayField.TIME)
      render()
    })
  }

  private fun editCategories() {
    val body = editor("分类").body
    val types = LinearLayout(context)
    listOf("expense" to "支出", "income" to "收入").forEach { (kind, label) ->
      types.addView(button(if (kind == type) "✓ $label" else label, true) {
        if (kind != type) draft = draft.copy(type = kind, categoryId = null, edited = draft.edited + setOf(OverlayField.TYPE, OverlayField.CATEGORY))
        editCategories()
      }, LinearLayout.LayoutParams(0, dp(46), 1f))
    }
    body.addView(types)
    categories.filter { it.type == type && it.parentId == null }.forEach { parent ->
      body.addView(categoryChoice(parent, parent.name))
      categories.filter { it.parentId == parent.id && it.type == type }.forEach { child ->
        body.addView(categoryChoice(child, "    ${child.name}"))
      }
    }
  }

  private fun goBack() {
    if (saving) return
    if (editorShowing) render() else onClose()
  }

  private fun resizeEditor() {
    if (!editorShowing) return
    val container = root ?: return
    val panel = card ?: return
    val displayHeight = context.resources.displayMetrics.heightPixels
    // min handles both resize-capable OEM windows and windows reporting the IME
    // as an inset without shrinking the overlay. The footer stays outside scroll.
    val viewport = minOf(container.height.takeIf { it > 0 } ?: displayHeight, (displayHeight - imeInset).coerceAtLeast(0))
    val height = minOf(dp(460), (viewport - dp(32)).coerceAtLeast(1))
    val top = ((viewport - height) / 2).coerceAtLeast(0)
    val layout = panel.layoutParams as FrameLayout.LayoutParams
    if (layout.height != height || layout.topMargin != top || layout.gravity != (Gravity.TOP or Gravity.CENTER_HORIZONTAL)) {
      panel.layoutParams = layout.apply { this.height = height; topMargin = top; gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL }
    }
  }

  private inner class FocusedEditText : EditText(context) {
    private var keyboardRequest = EditorImeRequest()

    override fun onAttachedToWindow() {
      super.onAttachedToWindow()
      requestFocus(); requestKeyboardWhenReady()
    }

    override fun onWindowFocusChanged(hasWindowFocus: Boolean) {
      super.onWindowFocusChanged(hasWindowFocus)
      if (hasWindowFocus) { requestFocus(); requestKeyboardWhenReady() }
    }

    override fun onFocusChanged(focused: Boolean, direction: Int, previouslyFocusedRect: Rect?) {
      super.onFocusChanged(focused, direction, previouslyFocusedRect)
      if (focused) requestKeyboardWhenReady()
    }

    override fun onDetachedFromWindow() {
      cancelKeyboardRequest()
      super.onDetachedFromWindow()
    }

    override fun onKeyPreIme(keyCode: Int, event: KeyEvent): Boolean {
      if (keyCode == KeyEvent.KEYCODE_BACK) {
        if (event.action == KeyEvent.ACTION_UP) goBack()
        return true
      }
      return super.onKeyPreIme(keyCode, event)
    }

    fun cancelKeyboardRequest() { keyboardRequest.cancel() }

    fun requestKeyboardWhenReady() {
      if (activeInput !== this || !editorShowing || !keyboardRequest.ready(isAttachedToWindow, hasWindowFocus(), hasFocus())) return
      // The post follows a confirmed focus/attach lifecycle callback, allowing
      // Android to establish the input connection before showing its native IME.
      post {
        if (activeInput !== this || !editorShowing) return@post
        if (!isAttachedToWindow || !hasWindowFocus() || !hasFocus()) {
          keyboardRequest = EditorImeRequest() // Wait for the next real focus event.
          return@post
        }
        (context.getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager).showSoftInput(this, InputMethodManager.SHOW_IMPLICIT)
      }
    }
  }

  private fun categoryChoice(category: OverlayCategory, label: String): TextView = text((if (category.id == categoryId) "✓ " else "") + label, 15f, INK).apply {
    gravity = Gravity.CENTER_VERTICAL; minHeight = dp(46); setOnClickListener {
      draft = draft.copy(categoryId = category.id, edited = draft.edited + OverlayField.CATEGORY); render()
    }
  }

  private fun displayTime(): String = runCatching {
    DateTimeFormatter.ofPattern("MM-dd HH:mm").format(Instant.parse(occurredAt).atZone(zone))
  }.getOrDefault("选择时间")

  private fun text(value: String, size: Float, color: Int) = TextView(context).apply {
    text = value; textSize = size; setTextColor(color); gravity = Gravity.CENTER_VERTICAL; includeFontPadding = false
  }

  private fun button(label: String, enabled: Boolean, action: () -> Unit): Button = Button(context).apply {
    text = label; textSize = 15f; isAllCaps = false; isEnabled = enabled
    minHeight = dp(48); setTextColor(if (enabled) SURFACE else SECONDARY)
    background = background(if (enabled) RED else SUNKEN, 16)
    setOnClickListener { if (isEnabled) action() }
  }

  private fun background(color: Int, radius: Int) = GradientDrawable().apply { setColor(color); cornerRadius = dp(radius).toFloat() }
  private fun dp(value: Int) = (value * context.resources.displayMetrics.density).toInt()

  companion object {
    private val SURFACE = Color.parseColor("#FFFDF8")
    private val SUNKEN = Color.parseColor("#F3EEE5")
    private val INK = Color.parseColor("#292624")
    private val SECONDARY = Color.parseColor("#726B64")
    private val RED = Color.parseColor("#9D5657")
    private val DANGER = Color.parseColor("#B34F48")
  }
}
