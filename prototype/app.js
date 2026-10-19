(() => {
  "use strict";

  const app = document.getElementById("app");
  const statusBar = document.getElementById("statusBar");
  const scenarioToggle = document.getElementById("scenarioToggle");
  const scenarioPanel = document.getElementById("scenarioPanel");
  const scenarioGroups = document.getElementById("scenarioGroups");
  const toastRegion = document.getElementById("toastRegion");

  const now = new Date();
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const expenseCategories = [
    { id: "food", name: "餐饮", icon: "utensils", bg: "#f5dfd6", fg: "#b86950", subs: ["早餐", "午餐", "晚餐", "咖啡奶茶", "外卖", "水果零食", "聚餐"] },
    { id: "transport", name: "交通", icon: "car", bg: "#e1e9ef", fg: "#5f7d91", subs: ["公交地铁", "打车", "加油充电", "停车", "火车飞机", "单车"] },
    { id: "shopping", name: "购物", icon: "bag", bg: "#f3e6d2", fg: "#a27435", subs: ["服饰", "日用品", "数码", "美妆个护", "家居"] },
    { id: "home", name: "居住", icon: "home", bg: "#e9e2f3", fg: "#79649d", subs: ["房租", "水电燃气", "物业", "维修"] },
    { id: "leisure", name: "娱乐", icon: "film", bg: "#f4e0e6", fg: "#a85d75", subs: ["电影演出", "游戏", "会员订阅", "旅游", "其他"] },
    { id: "health", name: "医疗健康", icon: "heart", bg: "#e1efe6", fg: "#578267", subs: ["门诊", "药品", "体检", "保险"] },
    { id: "study", name: "学习教育", icon: "book", bg: "#e2ebf5", fg: "#5d7ca0", subs: ["书籍", "课程", "考试", "文具"] },
    { id: "gift", name: "人情礼物", icon: "gift", bg: "#f5e1e1", fg: "#aa5e5e", subs: ["红包", "礼物", "请客", "孝敬"] },
    { id: "comm", name: "通讯网络", icon: "phone", bg: "#e6e9ec", fg: "#6f757b", subs: ["话费", "宽带", "云服务"] },
    { id: "pet", name: "宠物", icon: "paw", bg: "#f1e8dc", fg: "#997044", subs: ["主粮零食", "医疗", "用品", "服务"] },
    { id: "sport", name: "运动", icon: "dumbbell", bg: "#dff0ec", fg: "#4f897e", subs: ["场地", "装备", "课程"] },
    { id: "travel", name: "旅行", icon: "plane", bg: "#ddecF1", fg: "#527f90", subs: ["住宿", "门票", "交通", "餐饮"] },
    { id: "other", name: "其他", icon: "more", bg: "#ece8e4", fg: "#80776f", subs: ["其他"] }
  ];

  const incomeCategories = [
    { id: "salary", name: "工资", icon: "wallet", bg: "#e1efe6", fg: "#578267", subs: ["月薪", "补发"] },
    { id: "bonus", name: "奖金", icon: "gift", bg: "#f3e6d2", fg: "#a27435", subs: ["年终奖", "绩效"] },
    { id: "side", name: "兼职", icon: "briefcase", bg: "#e2ebf5", fg: "#5d7ca0", subs: ["稿费", "项目"] },
    { id: "invest", name: "理财收益", icon: "chart", bg: "#e9e2f3", fg: "#79649d", subs: ["利息", "基金"] },
    { id: "redpacket", name: "红包", icon: "gift", bg: "#f5e1e1", fg: "#aa5e5e", subs: ["亲友", "活动"] },
    { id: "refund", name: "退款", icon: "refresh", bg: "#e1e9ef", fg: "#5f7d91", subs: ["购物退款", "服务退款"] },
    { id: "reimburse", name: "报销", icon: "receipt", bg: "#dff0ec", fg: "#4f897e", subs: ["差旅", "办公"] },
    { id: "other-income", name: "其他", icon: "more", bg: "#ece8e4", fg: "#80776f", subs: ["其他"] }
  ];

  const allCategories = [...expenseCategories, ...incomeCategories];

  const icons = {
    mic: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="3" fill="currentColor" stroke="none"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',
    chart: '<path d="M4 19V9"/><path d="M10 19V5"/><path d="M16 19v-7"/><path d="M22 19H2"/>',
    settings: '<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1.1 1.5 1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.14.36.4.7.6 1 .28.3.7.44 1.1.4h.1a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.7.6Z"/>',
    filter: '<path d="M4 5h16"/><path d="M7 12h10"/><path d="M10 19h4"/>',
    plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
    close: '<path d="m6 6 12 12"/><path d="M18 6 6 18"/>',
    back: '<path d="m15 18-6-6 6-6"/>',
    right: '<path d="m9 18 6-6-6-6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    cloud: '<path d="M17.5 19H6.8A4.8 4.8 0 0 1 6 9.4 6.5 6.5 0 0 1 18.7 11a4 4 0 0 1-1.2 8Z"/><path d="m9.5 14 2.5 2.5 3-3"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
    download: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
    trash: '<path d="M3 6h18"/><path d="M8 6V3h8v3"/><path d="M19 6l-1 15H6L5 6"/><path d="M10 11v5"/><path d="M14 11v5"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M16 3v4"/><path d="M8 3v4"/><path d="M3 10h18"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    note: '<path d="M5 4h10l4 4v12H5Z"/><path d="M14 4v5h5"/><path d="M8 13h8"/><path d="M8 17h6"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    message: '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9.8 9.8 0 0 1-3.8-.8L3 21l1.7-4.2A8.4 8.4 0 1 1 21 11.5Z"/><path d="M8 10h.01"/><path d="M12 10h.01"/><path d="M16 10h.01"/>',
    more: '<circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="12" r="1" fill="currentColor"/>',
    refresh: '<path d="M20 7h-5V2"/><path d="M20 7a9 9 0 1 0 1 7"/>',
    alert: '<path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.8 3h15.6a2 2 0 0 0 1.8-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>',
    offline: '<path d="m3 3 18 18"/><path d="M8.5 8.5A7 7 0 0 1 20 13"/><path d="M5 13a8 8 0 0 1 1.2-4.2"/><path d="M8.5 17a5 5 0 0 1 7 0"/><path d="M12 21h.01"/>',
    quota: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    file: '<path d="M6 2h8l4 4v16H6Z"/><path d="M14 2v5h5"/>',
    wallet: '<path d="M4 5h14a2 2 0 0 1 2 2v13H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h13"/><path d="M16 13h4"/>',
    utensils: '<path d="M7 3v8"/><path d="M4 3v5a3 3 0 0 0 6 0V3"/><path d="M7 11v10"/><path d="M16 3c3 2 3 7 0 9v9"/>',
    car: '<path d="m5 11 2-6h10l2 6"/><path d="M3 13h18v6H3Z"/><circle cx="7" cy="19" r="2"/><circle cx="17" cy="19" r="2"/>',
    bag: '<path d="M5 8h14l1 13H4Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    home: '<path d="m3 11 9-8 9 8"/><path d="M5 10v11h14V10"/><path d="M9 21v-7h6v7"/>',
    film: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M7 4v16"/><path d="M17 4v16"/><path d="M3 9h4"/><path d="M3 15h4"/><path d="M17 9h4"/><path d="M17 15h4"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/>',
    bookOpen: '<path d="M2 4h6a4 4 0 0 1 4 4v13a4 4 0 0 0-4-4H2Z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a4 4 0 0 1 4-4h6Z"/>',
    gift: '<path d="M20 12v9H4v-9"/><path d="M2 7h20v5H2Z"/><path d="M12 7v14"/><path d="M12 7H7.5A2.5 2.5 0 1 1 10 4.5Z"/><path d="M12 7h4.5A2.5 2.5 0 1 0 14 4.5Z"/>',
    phone: '<rect x="7" y="2" width="10" height="20" rx="3"/><path d="M11 18h2"/>',
    paw: '<circle cx="7" cy="9" r="2"/><circle cx="17" cy="9" r="2"/><circle cx="10" cy="4.5" r="1.8"/><circle cx="14" cy="4.5" r="1.8"/><path d="M5.5 16.5c0-4 2.9-7 6.5-7s6.5 3 6.5 7c0 2.1-2.5 2.8-4 2.8l-2.5-.8-2.5.8c-1.5 0-4-.7-4-2.8Z"/>',
    dumbbell: '<path d="M6 7v10"/><path d="M3 9v6"/><path d="M18 7v10"/><path d="M21 9v6"/><path d="M6 12h12"/>',
    plane: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    briefcase: '<rect x="3" y="7" width="18" height="14" rx="3"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 12h18"/>',
    receipt: '<path d="M6 3h12v19l-3-2-3 2-3-2-3 2Z"/><path d="M9 8h6"/><path d="M9 12h6"/><path d="M9 16h4"/>',
    settings2: '<path d="M4 6h10"/><path d="M18 6h2"/><circle cx="16" cy="6" r="2"/><path d="M4 12h2"/><path d="M10 12h10"/><circle cx="8" cy="12" r="2"/><path d="M4 18h10"/><path d="M18 18h2"/><circle cx="16" cy="18" r="2"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
    logout: '<path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>',
    sparkle: '<path d="m12 3 1.3 4.2L17 9l-3.7 1.8L12 15l-1.3-4.2L7 9l3.7-1.8Z"/><path d="m5 16 .8 2.2L8 19l-2.2.8L5 22l-.8-2.2L2 19l2.2-.8Z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/>',
    trend: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    battery: '<rect x="2" y="7" width="18" height="10" rx="3" fill="none"/><path d="M22 10v4"/><rect x="4" y="9" width="13" height="6" rx="1.5" fill="currentColor" stroke="none"/>',
    wifi: '<path d="M5 9a10 10 0 0 1 14 0"/><path d="M8.5 12.5a5 5 0 0 1 7 0"/><path d="M12 17h.01"/>',
    signal: '<path d="M4 18v-2"/><path d="M9 18v-5"/><path d="M14 18v-8"/><path d="M19 18V7" stroke-width="3"/>'
  };

  function icon(name, size = 20, strokeWidth = 1.8) {
    const path = icons[name] || icons.more;
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
  }

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getCategory(id) {
    return state.categories.find((category) => category.id === id) || allCategories.find((category) => category.id === id) || expenseCategories[expenseCategories.length - 1];
  }

  function money(cents) {
    return (cents / 100).toLocaleString("zh-CN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function shortMoney(cents) {
    const amount = cents / 100;
    if (amount >= 10000) return `${(amount / 10000).toFixed(1).replace(".0", "")}万`;
    return amount.toLocaleString("zh-CN", { maximumFractionDigits: 0 });
  }

  function dateAt(daysAgo, hour, minute) {
    const value = new Date(now);
    value.setDate(value.getDate() - daysAgo);
    value.setHours(hour, minute, 0, 0);
    return value.toISOString();
  }

  function monthLabel(date) {
    return `${date.getFullYear()}年${date.getMonth() + 1}月`;
  }

  function isSameMonth(iso, date) {
    const value = new Date(iso);
    return value.getFullYear() === date.getFullYear() && value.getMonth() === date.getMonth();
  }

  function formatClock(iso) {
    return new Date(iso).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
  }

  function formatDateTime(iso) {
    const value = new Date(iso);
    return `${value.getMonth() + 1}月${value.getDate()}日 ${formatClock(iso)}`;
  }

  function dateGroupLabel(iso) {
    const value = new Date(iso);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(value.getFullYear(), value.getMonth(), value.getDate());
    const diff = Math.round((today - target) / 86400000);
    if (diff === 0) return "今天";
    if (diff === 1) return "昨天";
    const weekday = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][value.getDay()];
    return `${value.getMonth() + 1}月${value.getDate()}日 ${weekday}`;
  }

  function buildTransactions() {
    const rows = [
      [0, "food", 1800, "椰椰拿铁", 15, 10, "voice", "咖啡奶茶"],
      [0, "transport", 1800, "打车回家", 12, 51, "voice", "打车"],
      [0, "food", 2600, "午饭", 12, 26, "voice", "午餐"],
      [1, "shopping", 8640, "周末采购", 18, 35, "manual", "日用品"],
      [2, "leisure", 7600, "电影票", 20, 12, "manual", "电影演出"],
      [2, "transport", 600, "地铁", 9, 8, "voice", "公交地铁"],
      [3, "food", 2200, "手冲咖啡", 16, 40, "manual", "咖啡奶茶"],
      [4, "shopping", 13900, "换季衬衫", 14, 20, "manual", "服饰"],
      [5, "health", 5800, "感冒药", 19, 6, "manual", "药品"],
      [6, "food", 4200, "和朋友吃饭", 19, 40, "manual", "聚餐"],
      [7, "comm", 5000, "手机话费", 10, 10, "manual", "话费"],
      [8, "pet", 8900, "小猪罐头", 18, 22, "manual", "主粮零食"],
      [9, "study", 6800, "设计入门", 21, 10, "manual", "书籍"],
      [10, "salary", 1280000, "十月工资", 9, 2, "manual", "月薪", "income"],
      [11, "refund", 4250, "外卖退款", 13, 22, "manual", "服务退款", "income"],
      [12, "sport", 3900, "羽毛球场地", 20, 5, "manual", "场地"],
      [13, "food", 3580, "加班外卖", 20, 16, "voice", "外卖"],
      [14, "transport", 400, "公交", 8, 15, "voice", "公交地铁"],
      [15, "food", 6800, "朋友聚餐", 19, 33, "manual", "聚餐"],
      [16, "redpacket", 20000, "生日红包", 11, 20, "manual", "亲友", "income"],
      [17, "food", 2360, "水果", 17, 48, "manual", "水果零食"],
      [18, "home", 180000, "本月房租", 8, 0, "manual", "房租"]
    ];
    return rows.map((row, index) => {
      const [daysAgo, categoryId, amount, note, hour, minute, source, subcategory, type = "expense"] = row;
      return {
        id: `tx-${index + 1}`,
        type,
        amount,
        categoryId,
        subcategory,
        note,
        occurredAt: dateAt(daysAgo, hour, minute),
        source,
        createdAt: dateAt(daysAgo, hour, minute)
      };
    });
  }

  const state = {
    screen: "onboarding",
    stack: [],
    dataMode: "empty",
    categories: allCategories.map((category) => ({ ...category, subs: [...category.subs], archived: false, hidden: false, custom: false })),
    transactions: [],
    selectedMonth: currentMonth,
    filter: { type: "all", category: "all" },
    user: {
      loggedIn: false,
      nickname: "小满",
      backupEnabled: false,
      lastBackup: null
    },
    settings: {
      autoPost: true,
      voiceTips: true
    },
    modal: null,
    modalReturn: null,
    dialog: null,
    editor: null,
    voice: null,
    voiceTimer: null,
    undo: null,
    undoTimer: null,
    categoryTab: "expense",
    categorySearch: "",
    lastDeleted: null,
    backupStatus: "idle"
  };
  let directVoiceGesture = null;

  function resetState({ keepScreen = false } = {}) {
    clearTimeout(state.voiceTimer);
    clearTimeout(state.undoTimer);
    state.stack = keepScreen && state.screen !== "onboarding" ? state.stack : [];
    if (!keepScreen) state.screen = "onboarding";
    state.dataMode = "empty";
    state.categories = allCategories.map((category) => ({ ...category, subs: [...category.subs], archived: false, hidden: false, custom: false }));
    state.transactions = [];
    state.selectedMonth = currentMonth;
    state.filter = { type: "all", category: "all" };
    state.user = { loggedIn: false, nickname: "小满", backupEnabled: false, lastBackup: null };
    state.settings = { autoPost: true, voiceTips: true };
    state.modal = null;
    state.modalReturn = null;
    state.dialog = null;
    state.editor = null;
    state.voice = null;
    state.voiceTimer = null;
    state.undo = null;
    state.undoTimer = null;
    state.categoryTab = "expense";
    state.categorySearch = "";
    state.lastDeleted = null;
    state.backupStatus = "idle";
  }

  function loadDemoData() {
    state.dataMode = "full";
    if (!state.transactions.length) state.transactions = buildTransactions();
  }

  function currentCategoryList(type = "expense") {
    return state.categories.filter((category) => {
      const income = ["salary", "bonus", "side", "invest", "redpacket", "refund", "reimburse", "other-income"].includes(category.id);
      return (type === "income" ? income : !income) && !category.archived;
    });
  }

  function monthTransactions() {
    return state.transactions
      .filter((transaction) => isSameMonth(transaction.occurredAt, state.selectedMonth))
      .sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt));
  }

  function totals(transactions = monthTransactions()) {
    return transactions.reduce(
      (result, transaction) => {
        if (transaction.type === "income") result.income += transaction.amount;
        else result.expense += transaction.amount;
        return result;
      },
      { income: 0, expense: 0 }
    );
  }

  function categoryIconHtml(category, size = 39, className = "") {
    const resolved = category || getCategory("other");
    return `<span class="category-icon ${className}" style="background:${resolved.bg};color:${resolved.fg}">${icon(resolved.icon, Math.round(size * 0.47), 1.9)}</span>`;
  }

  function headerTime() {
    return now.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
  }

  function renderStatusBar() {
    statusBar.innerHTML = `
      <span>${headerTime()}</span>
      <span class="status-icons">
        ${icon("signal", 15, 2)}
        ${icon("wifi", 14, 2)}
        ${icon("battery", 20, 1.5)}
      </span>
    `;
  }

  function greeting() {
    const hour = now.getHours();
    if (hour < 6) return "夜深了";
    if (hour < 11) return "早上好";
    if (hour < 14) return "中午好";
    if (hour < 18) return "下午好";
    return "晚上好";
  }

  function renderOnboarding() {
    return `
      <section class="onboarding">
        <div class="brand-lockup">
          <img src="assets/pig.svg" alt="">
          <div><strong>声账</strong><span>一句话语音记账</span></div>
        </div>
        <div class="onboarding-art" aria-hidden="true">
          <span class="sound-ring ring-one"></span>
          <span class="sound-ring ring-two"></span>
          <div class="pig-hero"><img src="assets/pig.svg" alt=""></div>
          <span class="sound-dot">${icon("mic", 23, 2)}</span>
        </div>
        <div class="onboarding-copy">
          <h1>说一句，<br>就记好。</h1>
          <p>“午饭 25，打车 18”<br>剩下的，交给声账。</p>
          <div class="feature-strip">
            <span class="feature-chip">一句话多笔</span>
            <span class="feature-chip">自动分类</span>
            <span class="feature-chip">本地优先</span>
          </div>
        </div>
        <div class="onboarding-actions">
          <button class="btn btn-primary btn-block" type="button" data-action="finish-onboarding">开始记账</button>
          <button class="btn btn-ghost btn-block" type="button" data-action="try-demo">先用演示数据看看</button>
          <button class="skip-link" type="button" data-action="skip-onboarding">以后再说</button>
        </div>
      </section>
    `;
  }

  function renderBottomNav(active) {
    return `
      <nav class="bottom-nav" aria-label="主导航">
        <button class="nav-item ${active === "ledger" ? "active" : ""}" type="button" data-action="nav-ledger" aria-label="账本">
          ${icon("book", 21, active === "ledger" ? 2.2 : 1.75)}
          <span>账本</span>
        </button>
        <div class="voice-nav-wrap">
          <button class="voice-nav" type="button" data-action="open-voice" aria-label="按住说一句，松手自动记账">
            ${icon("mic", 26, 2.1)}
          </button>
          <span class="voice-nav-label">记账</span>
        </div>
        <button class="nav-item ${active === "stats" ? "active" : ""}" type="button" data-action="nav-stats" aria-label="统计">
          ${icon("chart", 21, active === "stats" ? 2.2 : 1.75)}
          <span>统计</span>
        </button>
      </nav>
    `;
  }

  function monthSwitcher() {
    return `
      <div class="month-switcher">
        <button type="button" data-action="month-prev" aria-label="上个月">${icon("back", 18, 2)}</button>
        <strong>${monthLabel(state.selectedMonth)}</strong>
        <button type="button" data-action="month-next" aria-label="下个月">${icon("right", 18, 2)}</button>
      </div>
    `;
  }

  function renderOverview() {
    const summary = totals();
    const balance = summary.income - summary.expense;
    const todayTransactions = state.transactions.filter((transaction) => {
      const date = new Date(transaction.occurredAt);
      return date.toDateString() === now.toDateString();
    });
    const todayExpense = todayTransactions
      .filter((transaction) => transaction.type === "expense")
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    return `
      <section class="overview-card">
        <div class="overview-top">
          <span>本月支出</span>
          <button type="button" data-action="nav-stats" aria-label="查看本月统计">${icon("chart", 17, 1.9)}</button>
        </div>
        <div class="overview-amount"><span class="currency">¥</span>${money(summary.expense)}</div>
        <div class="overview-bottom">
          <div class="overview-stat"><span>本月收入</span><strong>¥ ${money(summary.income)}</strong></div>
          <div class="overview-stat"><span>本月结余</span><strong>¥ ${money(balance)}</strong></div>
        </div>
      </section>
      <button class="today-card" type="button" data-action="open-today">
        <span class="today-pig"><img src="assets/pig.svg" alt=""></span>
        <span class="today-card-copy">
          <strong>今天</strong>
          <span>${todayTransactions.length ? `${todayTransactions.length} 笔记录 · 花得刚刚好` : "还没有记录，说一句就好"}</span>
        </span>
        <span class="today-amount">${todayTransactions.length ? `¥ ${money(todayExpense)}` : "去记账"}</span>
      </button>
    `;
  }

  function renderTransactionRow(transaction) {
    const category = getCategory(transaction.categoryId);
    const title = transaction.note || transaction.subcategory || category.name;
    return `
      <button class="transaction-row" type="button" data-action="open-transaction" data-id="${transaction.id}">
        ${categoryIconHtml(category, 39)}
        <span class="transaction-main">
          <strong>${esc(title)}</strong>
          <span>${esc(transaction.subcategory || category.name)} · ${formatClock(transaction.occurredAt)}</span>
          ${transaction.source === "voice" ? `<span class="source-badge">${icon("mic", 9, 2)} 语音记账</span>` : ""}
        </span>
        <span class="transaction-amount ${transaction.type === "income" ? "income" : ""}">
          ${transaction.type === "income" ? "+" : "−"}¥${money(transaction.amount)}
        </span>
      </button>
    `;
  }

  function filteredTransactions(transactions) {
    return transactions.filter((transaction) => {
      if (state.filter.type !== "all" && transaction.type !== state.filter.type) return false;
      if (state.filter.category !== "all" && transaction.categoryId !== state.filter.category) return false;
      return true;
    });
  }

  function groupedTransactions(transactions) {
    const groups = new Map();
    transactions.forEach((transaction) => {
      const key = new Date(transaction.occurredAt).toDateString();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(transaction);
    });
    return [...groups.values()];
  }

  function renderLedger() {
    const allTransactions = filteredTransactions(monthTransactions());
    const groups = groupedTransactions(allTransactions);
    const empty = state.dataMode === "empty" || !monthTransactions().length;
    const filterActive = state.filter.type !== "all" || state.filter.category !== "all";
    return `
      <section class="screen ${empty ? "" : ""}">
        <header class="app-header">
          <div>
            <div class="eyebrow">${greeting()} · 今天也要好好生活</div>
            <h1>我的账本</h1>
          </div>
          <div class="header-actions">
            <button class="icon-button tinted" type="button" data-action="open-filter" aria-label="筛选账单" style="${filterActive ? "color:var(--accent-deep)" : ""}">${icon("filter", 18, 1.9)}</button>
            <button class="icon-button tinted" type="button" data-action="open-editor" aria-label="手动记账">${icon("plus", 19, 2)}</button>
            <button class="avatar-button" type="button" data-action="nav-settings" aria-label="打开设置">${state.user.loggedIn ? "满" : "游"}</button>
          </div>
        </header>
        ${monthSwitcher()}
        ${renderOverview()}
        ${
          empty
            ? `
              <div class="empty-state">
                <div class="empty-illustration"><img src="assets/pig.svg" alt=""></div>
                <h2>今天还没有账单</h2>
                <p>按住中间的按钮，说一句“午饭 25”，第一笔就记好了。</p>
                <button class="btn btn-accent" type="button" data-action="open-voice">${icon("mic", 17, 2)} 说第一笔</button>
                <button class="text-button" type="button" data-action="try-demo">载入演示数据</button>
              </div>
            `
            : `
              <div class="section-heading">
                <h2>${filterActive ? "筛选结果" : "最近账单"}</h2>
                <button class="text-button" type="button" data-action="open-filter">${filterActive ? "修改筛选" : "全部账单"}</button>
              </div>
              ${
                groups.length
                  ? groups
                      .slice(0, 5)
                      .map(
                        (group) => `
                          <section class="date-group">
                            <div class="date-head">
                              <strong>${dateGroupLabel(group[0].occurredAt)}</strong>
                              <span>${group.length} 笔</span>
                            </div>
                            <div class="transaction-list">${group.map(renderTransactionRow).join("")}</div>
                          </section>
                        `
                      )
                      .join("")
                  : `<div class="empty-state" style="min-height:260px"><div class="empty-illustration" style="width:94px;height:94px;border-radius:31px"><img src="assets/pig.svg" alt=""></div><h2>没有符合条件的账单</h2><p>换个筛选条件，或者清空筛选看看。</p><button class="btn btn-soft" type="button" data-action="clear-filter">清空筛选</button></div>`
              }
            `
        }
      </section>
      ${renderBottomNav("ledger")}
    `;
  }

  function dailyTotals(transactions) {
    const days = new Date(state.selectedMonth.getFullYear(), state.selectedMonth.getMonth() + 1, 0).getDate();
    const values = Array.from({ length: days }, () => 0);
    transactions
      .filter((transaction) => transaction.type === "expense")
      .forEach((transaction) => {
        values[new Date(transaction.occurredAt).getDate() - 1] += transaction.amount;
      });
    return values;
  }

  function renderStats() {
    const transactions = monthTransactions();
    const summary = totals(transactions);
    const daily = dailyTotals(transactions);
    const maxDaily = Math.max(...daily, 1);
    const incomeIds = ["salary", "bonus", "side", "invest", "redpacket", "refund", "reimburse", "other-income"];
    const categoryTotals = state.categories
      .filter((category) => !incomeIds.includes(category.id))
      .map((category) => ({
        category,
        amount: transactions
          .filter((transaction) => transaction.type === "expense" && transaction.categoryId === category.id)
          .reduce((sum, transaction) => sum + transaction.amount, 0)
      }))
      .filter((row) => row.amount > 0)
      .sort((a, b) => b.amount - a.amount);
    const topCategories = categoryTotals.slice(0, 5);
    const otherAmount = categoryTotals.slice(5).reduce((sum, row) => sum + row.amount, 0);
    if (otherAmount) {
      topCategories.push({ category: { ...getCategory("other"), name: "其他" }, amount: otherAmount });
    }
    const donutColors = ["#e97d70", "#d6a169", "#8aa9b8", "#8eab92", "#a88ca7", "#b8afa6"];
    let cursor = 0;
    const gradient = topCategories
      .map((row, index) => {
        const start = cursor;
        const ratio = summary.expense ? (row.amount / summary.expense) * 100 : 0;
        cursor += ratio;
        return `${donutColors[index]} ${start}% ${cursor}%`;
      })
      .join(", ");
    const activeDays = daily.filter((amount) => amount > 0).length;
    const average = activeDays ? Math.round(summary.expense / activeDays) : 0;
    const maxIndex = daily.indexOf(Math.max(...daily));
    return `
      <section class="screen">
        <header class="app-header">
          <div>
            <div class="eyebrow">${monthLabel(state.selectedMonth)}</div>
            <h1>读懂每一笔</h1>
          </div>
          <button class="avatar-button" type="button" data-action="nav-settings" aria-label="打开设置">${state.user.loggedIn ? "满" : "游"}</button>
        </header>
        <div class="period-tabs">
          <button class="active" type="button">月度</button>
          <button type="button" data-action="year-soon">年度 · 即将上线</button>
        </div>
        ${monthSwitcher()}
        <section class="stats-card">
          <div class="stats-card-head">
            <div><h2>本月支出</h2><p>${transactions.filter((transaction) => transaction.type === "expense").length} 笔消费 · ${activeDays} 个记账日</p></div>
            <span class="trend-pill">${icon("trend", 10, 2)} 较上月 -12.4%</span>
          </div>
          <div style="margin-top:17px;font-size:31px;font-weight:680;letter-spacing:-.045em">¥ ${money(summary.expense)}</div>
          <div class="daily-chart" aria-label="每日支出柱状图">
            <span class="chart-grid-line top"></span>
            <span class="chart-grid-line mid"></span>
            ${daily
              .map(
                (amount, index) => `
                  <button class="chart-bar-wrap ${index + 1 === now.getDate() && state.selectedMonth.getMonth() === now.getMonth() ? "today" : ""}" type="button" data-action="open-day" data-day="${index + 1}" title="${index + 1}日：¥${money(amount)}" aria-label="${index + 1}日支出${money(amount)}元">
                    <span class="chart-bar" style="height:${Math.max(amount ? 5 : 3, (amount / maxDaily) * 101)}px"></span>
                    ${[1, 5, 10, 15, 20, 25, 30].includes(index + 1) || index === daily.length - 1 ? `<span class="chart-day">${index + 1}</span>` : ""}
                  </button>
                `
              )
              .join("")}
          </div>
          <div class="stats-totals">
            <div class="mini-total"><span>收入</span><strong>¥ ${money(summary.income)}</strong></div>
            <div class="mini-total"><span>日均支出</span><strong>¥ ${money(average)}</strong></div>
          </div>
        </section>
        <section class="stats-card">
          <div class="stats-card-head">
            <div><h2>花在了哪里</h2><p>按一级分类汇总</p></div>
            <button class="text-button" type="button" data-action="nav-ledger">看明细</button>
          </div>
          <div class="donut-row">
            <div class="donut" style="background:conic-gradient(${gradient || "#eee8e1 0 100%"})">
              <div class="donut-center"><strong>${topCategories.length || 0}</strong><span>个分类</span></div>
            </div>
            <div class="donut-legend">
              ${topCategories
                .map(
                  (row, index) => `
                    <div class="legend-row">
                      <span class="legend-dot" style="background:${donutColors[index]}"></span>
                      <span>${esc(row.category.name)}</span>
                      <strong>${summary.expense ? Math.round((row.amount / summary.expense) * 100) : 0}%</strong>
                    </div>
                  `
                )
                .join("") || `<div class="caption">有账单后，这里会显示分类占比。</div>`}
            </div>
          </div>
          <div class="rank-list">
            ${topCategories
              .slice(0, 4)
              .map(
                (row) => `
                  <div class="rank-row">
                    ${categoryIconHtml(row.category, 33, "rank-icon")}
                    <div class="rank-main">
                      <div class="rank-label"><span>${esc(row.category.name)}</span><strong>¥ ${money(row.amount)}</strong></div>
                      <div class="rank-track"><div class="rank-fill" style="width:${summary.expense ? Math.max(3, (row.amount / topCategories[0].amount) * 100) : 0}%;background:${row.category.fg}"></div></div>
                    </div>
                  </div>
                `
              )
              .join("")}
          </div>
        </section>
        <div class="stats-totals">
          <div class="mini-total"><span>最大支出日</span><strong>${maxDaily > 1 ? `${maxIndex + 1} 日` : "暂无"}</strong></div>
          <div class="mini-total"><span>本月结余</span><strong>¥ ${money(summary.income - summary.expense)}</strong></div>
        </div>
      </section>
      ${renderBottomNav("stats")}
    `;
  }

  function settingsRow({ action, iconName, title, subtitle, value, toggle, danger = false }) {
    return `
      <button class="settings-row" type="button" data-action="${action}" ${danger ? 'data-danger="true"' : ""}>
        <span class="settings-icon" style="${danger ? "background:#f8e4e1;color:#ca5d59" : ""}">${icon(iconName, 17, 1.9)}</span>
        <span class="settings-main"><strong style="${danger ? "color:#ca5d59" : ""}">${title}</strong>${subtitle ? `<span>${subtitle}</span>` : ""}</span>
        ${toggle !== undefined ? `<span class="toggle ${toggle ? "on" : ""}" role="switch" aria-checked="${toggle}" aria-label="${title}"></span>` : ""}
        ${value ? `<span class="settings-value">${value}</span>` : ""}
        ${danger || toggle !== undefined ? "" : `<span class="settings-chevron">${icon("right", 15, 2)}</span>`}
      </button>
    `;
  }

  function renderSettings() {
    const backupText = state.user.loggedIn
      ? state.user.lastBackup
        ? `最近备份 ${formatDateTime(state.user.lastBackup)}`
        : "已登录，等待首次备份"
      : "游客模式 · 数据仅保存在本机";
    return `
      <section class="screen no-nav">
        <header class="subpage-header">
          <button class="icon-button" type="button" data-action="go-back" aria-label="返回">${icon("back", 22, 2)}</button>
          <h1>设置</h1>
          <span class="header-spacer"></span>
        </header>
        <div class="profile-card">
          <span class="profile-avatar"><img src="assets/pig.svg" alt=""></span>
          <span class="profile-copy">
            <strong>${state.user.loggedIn ? `微信用户 · ${state.user.nickname}` : "游客账本"}</strong>
            <span>${backupText}</span>
          </span>
          <button class="btn" type="button" data-action="${state.user.loggedIn ? "nav-account" : "open-login"}">${state.user.loggedIn ? "管理" : "登录"}</button>
        </div>
        <div class="settings-group-title">记账偏好</div>
        <div class="settings-group">
          ${settingsRow({ action: "nav-categories", iconName: "grid", title: "分类管理", subtitle: "两级分类 · 排序、隐藏与归档" })}
          ${settingsRow({ action: "toggle-auto-post", iconName: "sparkle", title: "语音自动入账", subtitle: state.settings.autoPost ? "识别后直接记账，8 秒内可撤销" : "识别后先确认，再保存账单", toggle: state.settings.autoPost })}
          ${settingsRow({ action: "nav-privacy", iconName: "shield", title: "隐私与权限", subtitle: "录音、数据与本地存储" })}
        </div>
        <div class="settings-group-title">数据</div>
        <div class="settings-group">
          ${settingsRow({ action: "nav-account", iconName: "user", title: "账号与微信登录", subtitle: state.user.loggedIn ? "已登录" : "登录后可开启云备份", value: state.user.loggedIn ? "已连接" : "未登录" })}
          ${settingsRow({ action: "nav-backup", iconName: "cloud", title: "云备份", subtitle: state.user.loggedIn ? "非实时同步 · 可换机恢复" : "登录微信后开启", value: state.user.backupEnabled ? "已开启" : "未开启" })}
          ${settingsRow({ action: "open-export", iconName: "download", title: "导出与恢复", subtitle: "JSON 完整备份 / CSV 表格 / 本地恢复" })}
        </div>
        <div class="settings-group-title">其他</div>
        <div class="settings-group">
          ${settingsRow({ action: "toggle-voice-tips", iconName: "message", title: "语音示例提示", subtitle: "首次录音时展示可说的例子", toggle: state.settings.voiceTips })}
          ${settingsRow({ action: "open-about", iconName: "info", title: "关于声账", value: "v0.1" })}
          ${settingsRow({ action: "delete-all", iconName: "trash", title: "永久删除账本", danger: true })}
        </div>
        <p class="caption" style="margin:22px 4px 0;text-align:center">声账 v0.1 · 说一句，就记好。</p>
      </section>
    `;
  }

  function renderCategories() {
    const type = state.categoryTab;
    const categories = currentCategoryList(type).filter((category) => {
      const keyword = state.categorySearch.trim();
      if (!keyword) return true;
      return category.name.includes(keyword) || category.subs.some((sub) => sub.includes(keyword));
    });
    return `
      <section class="screen no-nav">
        <header class="subpage-header">
          <button class="icon-button" type="button" data-action="go-back" aria-label="返回">${icon("back", 22, 2)}</button>
          <h1>分类管理</h1>
          <button class="icon-button" type="button" data-action="add-category" aria-label="新增分类">${icon("plus", 21, 2)}</button>
        </header>
        <div class="period-tabs">
          <button class="${type === "expense" ? "active" : ""}" type="button" data-action="category-tab" data-tab="expense">支出</button>
          <button class="${type === "income" ? "active" : ""}" type="button" data-action="category-tab" data-tab="income">收入</button>
        </div>
        <div class="search-field">
          ${icon("search", 17, 2)}
          <input id="categorySearchInput" data-search-categories value="${esc(state.categorySearch)}" placeholder="搜索分类或子分类" aria-label="搜索分类">
        </div>
        <div class="category-manage-list">
          ${
            categories.length
              ? categories
                  .map(
                    (category) => `
                      <div class="category-manage-row">
                        ${categoryIconHtml(category, 42)}
                        <div class="category-manage-copy">
                          <strong>${esc(category.name)}</strong>
                          <div class="subcategory-preview">
                            ${category.subs.slice(0, 4).map((sub, index) => `<button class="sub-pill" type="button" data-action="edit-subcategory" data-id="${category.id}" data-index="${index}">${esc(sub)}</button>`).join("")}
                            ${category.subs.length > 4 ? `<span>+${category.subs.length - 4}</span>` : ""}
                          </div>
                        </div>
                        <button class="tiny-icon" type="button" data-action="edit-category" data-id="${category.id}" aria-label="管理${esc(category.name)}">${icon("edit", 17, 1.9)}</button>
                        <button class="tiny-icon" type="button" data-action="category-order" data-id="${category.id}" data-direction="1" aria-label="下移${esc(category.name)}">${icon("down", 17, 1.9)}</button>
                      </div>
                    `
                  )
                  .join("")
              : `<div style="padding:35px 20px;text-align:center;color:var(--muted);font-size:12px">没有找到相关分类</div>`
          }
        </div>
        <button class="add-category-button" type="button" data-action="add-category">${icon("plus", 16, 2)} 新增${type === "income" ? "收入" : "支出"}分类</button>
        <div class="note-card"><strong>分类也可以很轻</strong>已有账单引用的分类不会被真正删除。归档后它不再出现在新账单里，但历史统计仍能正确显示。</div>
      </section>
    `;
  }

  function renderAccount() {
    return `
      <section class="screen no-nav">
        <header class="subpage-header">
          <button class="icon-button" type="button" data-action="go-back" aria-label="返回">${icon("back", 22, 2)}</button>
          <h1>账号</h1>
          <span class="header-spacer"></span>
        </header>
        <section class="account-hero">
          <span class="profile-avatar"><img src="assets/pig.svg" alt=""></span>
          <h2>${state.user.loggedIn ? `微信用户 · ${state.user.nickname}` : "先记账，再登录"}</h2>
          <p>${state.user.loggedIn ? "账本已与本机微信账号关联。云备份用于换机恢复，不改变本地优先的原则。" : "游客账本完整可用。登录只用于云备份与换机恢复，不会强制你注册。"}</p>
          ${
            state.user.loggedIn
              ? `<button class="btn btn-block" type="button" data-action="nav-backup" style="margin-top:18px;background:rgba(255,255,255,.1);color:#fffaf5">${icon("cloud", 17, 1.9)} 查看云备份</button>`
              : `<button class="wechat-button" type="button" data-action="open-login">${icon("message", 20, 2)} 微信一键登录</button>`
          }
        </section>
        <div class="settings-group">
          ${settingsRow({
            action: "nav-backup",
            iconName: "cloud",
            title: "云端账本",
            subtitle: state.user.loggedIn ? "自动备份已开启" : "登录微信后可用",
            value: state.user.backupEnabled ? "已开启" : "未开启"
          })}
          ${settingsRow({
            action: "open-privacy-policy",
            iconName: "shield",
            title: "账号与隐私说明",
            subtitle: "微信昵称仅用于标识你的云端账本"
          })}
        </div>
        ${
          state.user.loggedIn
            ? `
              <div class="note-card"><strong>本机账本仍然是主账本</strong>退出登录不会删除本机账单，只会停止后续的云备份。重新登录后可继续使用上次的备份。</div>
              <button class="btn btn-danger btn-block" type="button" data-action="logout" style="margin-top:14px">${icon("logout", 17, 1.9)} 退出微信登录</button>
            `
            : `<div class="note-card"><strong>为什么先记账、后登录</strong>首次打开就能完成记账，不因为授权、验证码或网络问题打断体验。微信 AppID 与密钥只会配置在服务端。</div>`
        }
      </section>
    `;
  }

  function renderBackup() {
    const loggedIn = state.user.loggedIn;
    const backupTime = state.user.lastBackup ? formatDateTime(state.user.lastBackup) : "还没有完成备份";
    const statusLabel =
      state.backupStatus === "backing_up"
        ? "正在备份…"
        : state.backupStatus === "failed"
          ? "备份没有完成"
          : state.user.lastBackup
            ? "备份正常"
            : "等待首次备份";
    return `
      <section class="screen no-nav">
        <header class="subpage-header">
          <button class="icon-button" type="button" data-action="go-back" aria-label="返回">${icon("back", 22, 2)}</button>
          <h1>云备份</h1>
          <span class="header-spacer"></span>
        </header>
        <section class="backup-hero">
          <div class="backup-icon">${icon(loggedIn ? "cloud" : "lock", 24, 1.9)}</div>
          <h2>${loggedIn ? statusLabel : "登录后开启云备份"}</h2>
          <p>${loggedIn ? "你的账本会在本机发生变化后自动备份。云备份用于设备迁移，不是实时多端同步。" : "云备份仅保存账单、分类和设置，不上传录音，也不会读取你的历史聊天记录。"}</p>
          <div class="backup-time"><span class="status-dot" style="${loggedIn ? "" : "background:#c9b8ab;box-shadow:none"}"></span>${loggedIn ? backupTime : "本机账本仍可正常使用"}</div>
          ${state.backupStatus === "backing_up" ? `<div class="backup-progress"><span></span></div>` : ""}
        </section>
        ${
          loggedIn
            ? `
              <div class="settings-group" style="margin-top:14px">
                ${settingsRow({
                  action: "toggle-backup",
                  iconName: "cloud",
                  title: "自动云备份",
                  subtitle: "本机数据变化后自动上传",
                  toggle: state.user.backupEnabled
                })}
                ${settingsRow({
                  action: "open-conflict",
                  iconName: "refresh",
                  title: "从云端恢复",
                  subtitle: "换机或重装后找回账本",
                  value: "本机 23 笔 / 云端 25 笔"
                })}
              </div>
              <div class="backup-actions">
                <button class="btn btn-primary" type="button" data-action="backup-now">${icon("cloud", 18, 2)} ${state.backupStatus === "backing_up" ? "正在备份…" : "立即备份"}</button>
                <button class="btn btn-soft" type="button" data-action="open-conflict">检查云端版本</button>
              </div>
              <div class="data-summary">
                <div><strong>${state.transactions.length}</strong><span>本机账单</span></div>
                <div><strong>${state.transactions.length + 2}</strong><span>云端账单</span></div>
                <div><strong>${state.user.lastBackup ? "12 KB" : "—"}</strong><span>备份大小</span></div>
              </div>
              ${
                state.backupStatus === "failed"
                  ? `<div class="note-card" style="border-color:rgba(179,79,72,.18);background:rgba(179,79,72,.07)"><strong style="color:var(--danger)">这次备份没有上传成功</strong>本机账本没有受到影响。检查网络后可以重新备份，下一次本机变化时也会自动重试。</div>`
                  : ""
              }
              <div class="note-card"><strong>恢复前总会先询问你</strong>当本机与云端都有数据时，声账不会静默覆盖任何一边。你可以合并，也可以明确选择以某一端为主。</div>
            `
            : `
              <button class="wechat-button" type="button" data-action="open-login">${icon("message", 20, 2)} 微信一键登录并开启备份</button>
              <div class="note-card"><strong>服务器不保存录音</strong>语音只用于当次转写和结构化解析。云备份只包含账单、分类、设置，以及恢复所需的版本与校验信息。</div>
            `
        }
      </section>
    `;
  }

  function renderPrivacy() {
    return `
      <section class="screen no-nav">
        <header class="subpage-header">
          <button class="icon-button" type="button" data-action="go-back" aria-label="返回">${icon("back", 22, 2)}</button>
          <h1>隐私与权限</h1>
          <span class="header-spacer"></span>
        </header>
        <section class="stats-card">
          <div class="stats-card-head">
            <div><h2>录音只为听懂这一句</h2><p>语音最小化处理，不进入你的账本历史。</p></div>
            <span class="backup-icon" style="width:43px;height:43px;background:var(--green-soft);color:var(--green)">${icon("shield", 21, 1.9)}</span>
          </div>
          <div class="note-card" style="margin-top:18px;background:var(--surface-soft);border-color:transparent"><strong>我们如何处理语音</strong>录音会发送到云端进行转写和结构化解析；处理完成后立即丢弃。服务端不保存录音、转写全文或账单正文，日志使用脱敏请求编号。</div>
        </section>
        <div class="settings-group">
          ${settingsRow({ action: "request-mic", iconName: "mic", title: "麦克风", subtitle: "只在按住录音时使用", value: "按需授权" })}
          ${settingsRow({ action: "privacy-local", iconName: "lock", title: "本机账本", subtitle: "默认不进入系统自动云备份", value: "本机加密" })}
          ${settingsRow({ action: "open-export", iconName: "download", title: "带走你的数据", subtitle: "随时导出 JSON 或 CSV" })}
          ${settingsRow({ action: "delete-all", iconName: "trash", title: "永久删除全部数据", danger: true })}
        </div>
        <div class="note-card"><strong>拒绝麦克风也不会失去功能</strong>麦克风被拒绝后，手动记账、账本、分类与统计仍全部可用。你可以在系统设置里随时重新授权。</div>
        <button class="btn btn-soft btn-block" type="button" data-action="open-privacy-policy" style="margin-top:14px">${icon("file", 17, 1.9)} 查看隐私政策摘要</button>
      </section>
    `;
  }

  function renderEditor() {
    const editor = state.editor;
    const categories = currentCategoryList(editor.type).filter((category) => !category.hidden);
    const selected = categories.find((category) => category.id === editor.categoryId) || categories[0];
    const amountText = editor.amount || "0";
    return `
      <div class="full-page">
        <div class="entry-page">
          <header class="entry-header">
            <button class="text-button" type="button" data-action="close-modal">取消</button>
            <div class="type-switch">
              <div class="type-segment">
                <button class="${editor.type === "expense" ? "active" : ""}" type="button" data-action="editor-type" data-type="expense">支出</button>
                <button class="${editor.type === "income" ? "active" : ""}" type="button" data-action="editor-type" data-type="income">收入</button>
              </div>
            </div>
            <button class="text-button save" type="button" data-action="save-editor">保存</button>
          </header>
          <div class="entry-scroll">
            <div class="amount-area">
              <span class="amount-label">${editor.type === "income" ? "收入金额" : "支出金额"}</span>
              <div class="amount-display ${editor.amount === "0" || !editor.amount ? "empty" : ""}">
                <span class="currency">¥</span>${amountText}
              </div>
            </div>
            <div class="entry-section-label">选择分类</div>
            <div class="category-grid">
              ${categories
                .map(
                  (category) => `
                    <button class="category-choice ${selected && selected.id === category.id ? "selected" : ""}" type="button" data-action="editor-category" data-id="${category.id}">
                      ${categoryIconHtml(category, 45)}
                      <span>${esc(category.name)}</span>
                    </button>
                  `
                )
                .join("")}
            </div>
            ${
              selected
                ? `
                  <div class="entry-section-label">子分类（可选）</div>
                  <div class="subcategory-chips">
                    ${(selected.subs || []).map((sub) => `<button class="sub-chip ${editor.subcategory === sub ? "active" : ""}" type="button" data-action="editor-subcategory" data-value="${esc(sub)}">${esc(sub)}</button>`).join("")}
                  </div>
                `
                : ""
            }
            <div class="form-rows">
              <div class="form-row">
                ${icon("calendar", 17, 1.9)}
                <label for="entryDate">日期</label>
                <input id="entryDate" data-editor-date type="datetime-local" value="${editor.dateInput}" aria-label="记账日期">
              </div>
              <div class="form-row">
                ${icon("note", 17, 1.9)}
                <label for="entryNote">备注</label>
                <input id="entryNote" data-editor-note maxlength="40" value="${esc(editor.note)}" placeholder="${selected ? esc(selected.subs[0] || selected.name) : "写点什么"}" aria-label="备注">
              </div>
            </div>
            ${editor.txId ? `<button class="btn btn-danger btn-block delete-entry" type="button" data-action="delete-editor">${icon("trash", 17, 1.9)} 删除这笔账单</button>` : ""}
          </div>
          <div class="keypad" aria-label="金额键盘">
            ${["1", "2", "3", "backspace", "4", "5", "6", "date", "7", "8", "9", "note", ".", "0", "00", "save"]
              .map((key) => {
                if (key === "backspace") return `<button class="key utility" type="button" data-action="editor-key" data-key="backspace" aria-label="删除一位">${icon("back", 18, 2)}</button>`;
                if (key === "date") return `<button class="key utility" type="button" data-action="editor-focus-date">日期</button>`;
                if (key === "note") return `<button class="key utility" type="button" data-action="editor-focus-note">备注</button>`;
                if (key === "save") return `<button class="key submit" type="button" data-action="save-editor">完成</button>`;
                return `<button class="key" type="button" data-action="editor-key" data-key="${key}">${key}</button>`;
              })
              .join("")}
          </div>
        </div>
      </div>
    `;
  }

  function voiceShell(content, extraClass = "") {
    return `
      <div class="modal-layer voice ${extraClass}">
        <div class="voice-panel">
          <div class="voice-top">
            <div class="voice-brand"><img src="assets/pig.svg" alt=""> 声账 · 语音记账</div>
            <button class="icon-button" type="button" data-action="close-voice" aria-label="关闭语音记账">${icon("close", 21, 2)}</button>
          </div>
          ${content}
        </div>
      </div>
    `;
  }

  function renderVoice() {
    const voice = state.voice;
    if (!voice) return "";
    if (voice.phase === "recording") {
      return voiceShell(`
        <div class="voice-main">
          <div class="voice-status">VOICE TO LEDGER</div>
          <h2 class="voice-title" id="voiceTitle">我在听，请说</h2>
          <p class="voice-subtitle" id="voiceSubtitle">例如：午饭 25，打车 18</p>
          <div class="voice-orb recording" aria-hidden="true">
            ${icon("mic", 46, 1.65)}
          </div>
          <div class="waveform" id="voiceWave">${Array.from({ length: 19 }, () => "<span></span>").join("")}</div>
          <p class="voice-hint" id="voiceHint">松开完成 · 上滑取消</p>
          <p class="voice-hint" style="margin-top:6px;opacity:.72">正在录音 · 最长 30 秒</p>
        </div>
      `);
    }
    if (voice.phase === "parsing") {
      return voiceShell(`
        <div class="voice-main">
          <div class="voice-status">VOICE TO LEDGER</div>
          <h2 class="voice-title">正在听懂你的话…</h2>
          <p class="voice-subtitle">识别金额、分类与时间</p>
          <div class="voice-orb parsing">
            <div class="waveform" style="margin:0">
              ${Array.from({ length: 13 }, () => "<span></span>").join("")}
            </div>
          </div>
          <p class="voice-hint">通常只需要 2–3 秒</p>
        </div>
      `);
    }
    if (voice.phase === "error") {
      const errors = {
        network: {
          icon: "offline",
          title: "网络没有接上",
          body: "这句话还在本页，不用重新想。检查网络后再试一次，或者直接手动记账。",
          primary: "重新识别",
          secondary: "手动记账"
        },
        quota: {
          icon: "quota",
          title: "今天的语音额度用完了",
          body: "每天可进行 20 次语音记账，明天会自动恢复。手动记账不受额度限制。",
          primary: "改为手动记账",
          secondary: "返回账本"
        },
        microphone: {
          icon: "mic",
          title: "还没有麦克风权限",
          body: "声账只在你按住说话时使用麦克风。可以去系统设置重新开启，手动记账依旧完整可用。",
          primary: "打开系统设置",
          secondary: "手动记账"
        }
      };
      const error = errors[voice.error] || errors.network;
      return voiceShell(`
        <div class="voice-main">
          <div class="voice-error">
            <span class="backup-icon" style="margin:0 auto;background:rgba(255,255,255,.09);color:#f1b0a5">${icon(error.icon, 25, 1.8)}</span>
            <h3>${error.title}</h3>
            <p>${error.body}</p>
          </div>
          <div class="voice-result-actions" style="width:100%">
            <button class="btn btn-accent" type="button" data-action="${voice.error === "network" ? "voice-retry" : voice.error === "microphone" ? "request-mic" : "open-editor"}">${error.primary}</button>
            <button class="btn btn-light" type="button" data-action="${voice.error === "quota" ? "close-voice" : "open-editor"}">${error.secondary}</button>
          </div>
        </div>
      `);
    }
    if (voice.phase === "result" || voice.phase === "confirm") {
      const confirm = voice.phase === "confirm";
      return voiceShell(`
        <div class="voice-result">
          <div class="voice-result-head">
            <span class="success-mark">${icon("check", 27, 2.4)}</span>
            <h2>${confirm ? "听懂啦，确认一下" : `已记入 ${voice.entries.length} 笔`}</h2>
            <p>${confirm ? "确认后保存到本机账本" : "账本已更新，8 秒内可以整批撤销"}</p>
          </div>
          <div class="transcript-card">
            <div class="transcript-label">${icon("mic", 12, 2)} 现场转写</div>
            <p class="transcript-text">“${esc(voice.transcript)}”</p>
          </div>
          <div class="voice-entry-list">
            ${voice.entries
              .map((entry, index) => {
                const category = getCategory(entry.categoryId);
                return `
                  <button class="voice-entry" type="button" data-action="voice-edit-entry" data-index="${index}" aria-label="修改${esc(entry.note || category.name)}">
                    ${categoryIconHtml(category, 37)}
                    <div class="voice-entry-copy">
                      <strong>${esc(entry.note || entry.subcategory || category.name)}</strong>
                      <span>${esc(entry.subcategory || category.name)} · 今天</span>
                    </div>
                    <span class="voice-entry-amount ${entry.type === "income" ? "income" : ""}">${entry.type === "income" ? "+" : "−"}¥${money(entry.amount)}</span>
                  </button>
                `;
              })
              .join("")}
          </div>
          <div class="voice-result-actions">
            ${
              confirm
                ? `<button class="btn btn-light" type="button" data-action="voice-edit">修改</button><button class="btn btn-accent" type="button" data-action="voice-confirm">确认入账</button>`
                : `<button class="btn btn-light" type="button" data-action="close-voice">继续记账</button><button class="btn btn-accent" type="button" data-action="open-ledger-after-voice">看看账本</button>`
            }
          </div>
        </div>
      `);
    }
    return voiceShell(`
      <div class="voice-main">
        <div class="voice-status">VOICE TO LEDGER</div>
        <h2 class="voice-title" id="voiceTitle">按住，说一句</h2>
        <p class="voice-subtitle" id="voiceSubtitle">例如：午饭 25，打车 18</p>
        <button class="voice-orb" id="voiceOrb" type="button" data-action="voice-orb" aria-label="按住说话，松开完成">
          ${icon("mic", 46, 1.65)}
        </button>
        <div class="waveform" id="voiceWave" style="opacity:.28">${Array.from({ length: 19 }, () => "<span></span>").join("")}</div>
        <p class="voice-hint" id="voiceHint">松手完成 · 上滑取消</p>
        <p class="voice-hint" style="margin-top:6px;opacity:.72">最长 30 秒 · 一句最多 5 笔</p>
        ${
          state.settings.voiceTips
            ? `<div class="voice-examples">
                <button class="voice-example" type="button" data-action="voice-sample" data-sample="multi">午饭 25，打车 18</button>
                <button class="voice-example" type="button" data-action="voice-sample" data-sample="salary">发工资八千</button>
                <button class="voice-example" type="button" data-action="voice-sample" data-sample="missing">昨天买咖啡，没记金额</button>
              </div>`
            : ""
        }
      </div>
    `);
  }

  function renderTransactionDetail() {
    const transaction = state.transactions.find((item) => item.id === state.modal.id);
    if (!transaction) return "";
    const category = getCategory(transaction.categoryId);
    return `
      <div class="modal-layer">
        <div class="sheet">
          <div class="sheet-handle"></div>
          <div class="detail-amount">
            ${categoryIconHtml(category, 58)}
            <strong>${transaction.type === "income" ? "+" : "−"}¥${money(transaction.amount)}</strong>
            <span>${esc(transaction.note || transaction.subcategory || category.name)}</span>
          </div>
          <div class="detail-rows">
            <div class="detail-row"><span>分类</span><strong>${esc(category.name)} · ${esc(transaction.subcategory || category.name)}</strong></div>
            <div class="detail-row"><span>时间</span><strong>${formatDateTime(transaction.occurredAt)}</strong></div>
            <div class="detail-row"><span>记录方式</span><strong>${transaction.source === "voice" ? "语音记账" : "手动记账"}</strong></div>
            <div class="detail-row"><span>账本</span><strong>我的账本</strong></div>
          </div>
          <div class="sheet-actions">
            <button class="btn btn-soft" type="button" data-action="edit-transaction" data-id="${transaction.id}">${icon("edit", 17, 1.9)} 编辑</button>
            <button class="btn btn-danger" type="button" data-action="delete-transaction" data-id="${transaction.id}">${icon("trash", 17, 1.9)} 删除</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderFilter() {
    const selectedCategory = state.filter.category === "all" ? null : getCategory(state.filter.category);
    return `
      <div class="modal-layer">
        <div class="sheet">
          <div class="sheet-handle"></div>
          <div class="sheet-head">
            <div><h2>筛选账单</h2><p>当前有 ${filteredTransactions(monthTransactions()).length} 笔符合条件的账单</p></div>
            <button class="icon-button" type="button" data-action="close-modal" aria-label="关闭筛选">${icon("close", 20, 2)}</button>
          </div>
          <div class="filter-section">
            <h3>收支类型</h3>
            <div class="filter-chips">
              ${[
                ["all", "全部"],
                ["expense", "支出"],
                ["income", "收入"]
              ]
                .map(([value, label]) => `<button class="filter-chip ${state.filter.type === value ? "active" : ""}" type="button" data-action="filter-type" data-type="${value}">${label}</button>`)
                .join("")}
            </div>
          </div>
          <div class="filter-section">
            <h3>分类</h3>
            <div class="filter-chips">
              <button class="filter-chip ${state.filter.category === "all" ? "active" : ""}" type="button" data-action="filter-category" data-id="all">全部分类</button>
              ${currentCategoryList(state.filter.type === "income" ? "income" : "expense")
                .map(
                  (category) =>
                    `<button class="filter-chip ${state.filter.category === category.id ? "active" : ""}" type="button" data-action="filter-category" data-id="${category.id}">${esc(category.name)}</button>`
                )
                .join("")}
            </div>
          </div>
          ${selectedCategory ? `<div class="note-card" style="margin-top:18px"><strong>${esc(selectedCategory.name)}</strong>包含 ${selectedCategory.subs.slice(0, 3).join("、")}等子分类。</div>` : ""}
          <div class="sheet-actions">
            <button class="btn btn-soft" type="button" data-action="clear-filter">清空</button>
            <button class="btn btn-primary" type="button" data-action="close-modal">查看 ${filteredTransactions(monthTransactions()).length} 笔</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderDayDetail() {
    const day = Number(state.modal.day);
    const date = new Date(state.selectedMonth.getFullYear(), state.selectedMonth.getMonth(), day);
    const transactions = monthTransactions().filter((transaction) => new Date(transaction.occurredAt).getDate() === day);
    const summary = totals(transactions);
    return `
      <div class="modal-layer">
        <div class="sheet">
          <div class="sheet-handle"></div>
          <div class="sheet-head">
            <div><h2>${date.getMonth() + 1}月${day}日</h2><p>${transactions.length} 笔 · 支出 ¥${money(summary.expense)}</p></div>
            <button class="icon-button" type="button" data-action="close-modal" aria-label="关闭当日明细">${icon("close", 20, 2)}</button>
          </div>
          ${transactions.length ? `<div class="transaction-list">${transactions.map(renderTransactionRow).join("")}</div>` : `<div class="empty-state" style="min-height:220px"><div class="empty-illustration" style="width:80px;height:80px;border-radius:26px"><img src="${"assets/pig.svg"}" alt=""></div><h2>这天没有账单</h2><p>点选有支出的柱子，可以看到具体明细。</p></div>`}
          <div class="sheet-actions"><button class="btn btn-soft btn-block" type="button" data-action="close-modal">完成</button></div>
        </div>
      </div>
    `;
  }

  function renderLogin() {
    if (state.modal.type === "login-success") {
      return `
        <div class="modal-layer">
          <div class="sheet wechat-sheet">
            <div class="sheet-handle"></div>
            <div style="padding:8px 0 4px;text-align:center">
              <span class="success-mark">${icon("check", 27, 2.4)}</span>
              <h2 style="margin:0;font-size:22px">登录成功</h2>
              <p class="caption" style="margin:8px 0 20px">游客账本已关联，后续变更会自动备份。</p>
            </div>
            <div class="permission-list">
              <div class="permission-row">${icon("check", 17, 2)}<span>现有本机账本已保留</span></div>
              <div class="permission-row">${icon("check", 17, 2)}<span>自动云备份已开启</span></div>
              <div class="permission-row">${icon("check", 17, 2)}<span>录音仍然不会被保存</span></div>
            </div>
            <div class="sheet-actions"><button class="btn btn-primary btn-block" type="button" data-action="finish-login">完成</button></div>
          </div>
        </div>
      `;
    }
    return `
      <div class="modal-layer">
        <div class="sheet wechat-sheet">
          <div class="sheet-handle"></div>
          <div class="wechat-head">
            <span class="wechat-logo">${icon("message", 24, 2)}</span>
            <div><strong>微信一键登录</strong><span>用于同步云端备份，不读取通讯录</span></div>
          </div>
          <div class="permission-list">
            <div class="permission-row">${icon("check", 17, 2)}<span>使用微信昵称标识你的云端账本</span></div>
            <div class="permission-row">${icon("check", 17, 2)}<span>上传账单、分类和设置用于备份</span></div>
            <div class="permission-row">${icon("check", 17, 2)}<span>不读取聊天记录，不分享任何数据</span></div>
          </div>
          <p class="privacy-inline">登录后，本机账本仍是主账本。你可以随时退出登录并导出全部数据。</p>
          <div class="sheet-actions">
            <button class="btn btn-soft" type="button" data-action="close-modal">暂不登录</button>
            <button class="btn" type="button" style="background:#18a058;color:#fff" data-action="allow-login">${icon("message", 17, 2)} 允许</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderConflict() {
    return `
      <div class="modal-layer">
        <div class="sheet">
          <div class="sheet-handle"></div>
          <div class="sheet-head">
            <div><h2>本机与云端都有账本</h2><p>恢复前请选择保留方式，不会静默覆盖。</p></div>
            <button class="icon-button" type="button" data-action="close-modal" aria-label="关闭恢复选择">${icon("close", 20, 2)}</button>
          </div>
          <div class="conflict-compare">
            <div class="conflict-card"><strong>本机</strong><span>${state.transactions.length} 笔账单<br>更新于刚刚</span></div>
            <div class="conflict-card cloud"><strong>云端</strong><span>${state.transactions.length + 2} 笔账单<br>更新于昨天 21:40</span></div>
          </div>
          <div class="choice-list">
            <button class="choice-button recommended" type="button" data-action="merge-backup">
              <span class="settings-icon" style="background:var(--accent-soft);color:var(--accent-deep)">${icon("refresh", 17, 2)}</span>
              <span class="choice-copy" style="margin-left:10px"><strong>合并两边账单</strong><span>推荐。按账单 ID 去重，保留全部记录</span></span>
              <span class="settings-chevron">${icon("right", 16, 2)}</span>
            </button>
            <button class="choice-button" type="button" data-action="use-cloud">
              <span class="settings-icon">${icon("cloud", 17, 2)}</span>
              <span class="choice-copy" style="margin-left:10px"><strong>使用云端覆盖本机</strong><span>本机当前账本会被替换，可先导出备份</span></span>
              <span class="settings-chevron">${icon("right", 16, 2)}</span>
            </button>
            <button class="choice-button" type="button" data-action="close-modal">
              <span class="settings-icon">${icon("back", 17, 2)}</span>
              <span class="choice-copy" style="margin-left:10px"><strong>暂不恢复</strong><span>保留当前本机账本</span></span>
              <span class="settings-chevron">${icon("right", 16, 2)}</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function renderExport() {
    return `
      <div class="modal-layer">
        <div class="sheet">
          <div class="sheet-handle"></div>
          <div class="sheet-head">
            <div><h2>导出账本</h2><p>演示数据会生成本地文件，不经过服务器。</p></div>
            <button class="icon-button" type="button" data-action="close-modal" aria-label="关闭导出">${icon("close", 20, 2)}</button>
          </div>
          <div class="action-sheet">
            <button class="btn" type="button" data-action="export-json">
              ${icon("file", 20, 1.9)}
              <span class="action-copy"><strong>JSON 完整备份</strong><span>账单、分类、设置与版本信息，适合迁移恢复</span></span>
            </button>
            <button class="btn" type="button" data-action="export-csv">
              ${icon("chart", 20, 1.9)}
              <span class="action-copy"><strong>CSV 表格</strong><span>适合在 Excel、Numbers 中查看和分析</span></span>
            </button>
            <button class="btn" type="button" data-action="import-json">
              ${icon("refresh", 20, 1.9)}
              <span class="action-copy"><strong>从 JSON 备份恢复</strong><span>读取本机文件，恢复前会先校验数据</span></span>
            </button>
          </div>
          <p class="privacy-inline">导出文件由本机直接生成，声账不会收到副本。请妥善保管包含个人消费信息的文件。</p>
          <input id="importBackupInput" type="file" accept="application/json,.json" hidden>
        </div>
      </div>
    `;
  }

  function renderSubcategoryActions() {
    const category = state.categories.find((item) => item.id === state.modal.categoryId);
    const sub = category?.subs?.[state.modal.index] || "";
    return `
      <div class="modal-layer">
        <div class="sheet">
          <div class="sheet-handle"></div>
          <div class="sheet-head">
            <div><h2>${esc(sub)}</h2><p>${esc(category?.name || "")} · 二级分类</p></div>
            <button class="icon-button" type="button" data-action="close-modal" aria-label="关闭子分类管理">${icon("close", 20, 2)}</button>
          </div>
          <div class="category-form">
            <label for="subcategoryName">子分类名称</label>
            <input id="subcategoryName" data-subcategory-name maxlength="8" value="${esc(sub)}">
          </div>
          <div class="sheet-actions">
            <button class="btn btn-danger" type="button" data-action="archive-subcategory">${icon("trash", 17, 1.9)} 归档</button>
            <button class="btn btn-primary" type="button" data-action="save-subcategory">保存修改</button>
          </div>
          <p class="privacy-inline">归档子分类不会改写历史账单。已有记录仍会显示原来的名称。</p>
        </div>
      </div>
    `;
  }

  function renderCategoryForm() {
    const form = state.modal.form;
    const categories = currentCategoryList(form.type).filter((category) => category.id !== form.categoryId);
    return `
      <div class="modal-layer">
        <div class="sheet">
          <div class="sheet-handle"></div>
          <div class="sheet-head">
            <div><h2>${form.mode === "edit" ? "管理分类" : "新增分类"}</h2><p>${form.mode === "edit" ? "历史账单引用不会受影响。" : "可以放在一级分类下，也可以单独创建。"}</p></div>
            <button class="icon-button" type="button" data-action="close-modal" aria-label="关闭分类编辑">${icon("close", 20, 2)}</button>
          </div>
          <div class="category-form">
            <label for="categoryName">分类名称</label>
            <input id="categoryName" data-category-name maxlength="8" value="${esc(form.name)}" placeholder="例如：夜宵">
            <label for="categoryParent">所属层级</label>
            <select id="categoryParent" data-category-parent>
              <option value="" ${!form.parentId ? "selected" : ""}>一级分类</option>
              ${categories.map((category) => `<option value="${category.id}" ${form.parentId === category.id ? "selected" : ""}>${esc(category.name)} / 二级分类</option>`).join("")}
            </select>
            ${
              form.mode === "edit"
                ? `
                  <div class="choice-list" style="margin-top:19px">
                    <button class="choice-button" type="button" data-action="category-visibility"><span class="settings-icon">${icon("grid", 17, 1.9)}</span><span class="choice-copy" style="margin-left:10px"><strong>${form.hidden ? "显示分类" : "隐藏分类"}</strong><span>隐藏后不出现在新账单选择里</span></span></button>
                    <button class="choice-button" type="button" data-action="category-archive"><span class="settings-icon" style="background:#f8e4e1;color:var(--danger)">${icon("trash", 17, 1.9)}</span><span class="choice-copy" style="margin-left:10px"><strong>归档分类</strong><span>保留历史统计，不再用于新账单</span></span></button>
                  </div>
                `
                : ""
            }
          </div>
          <div class="sheet-actions">
            <button class="btn btn-soft" type="button" data-action="close-modal">取消</button>
            <button class="btn btn-primary" type="button" data-action="save-category">${form.mode === "edit" ? "保存修改" : "创建分类"}</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderAbout() {
    return `
      <div class="modal-layer">
        <div class="sheet">
          <div class="sheet-handle"></div>
          <div style="text-align:center;padding:7px 0 5px">
            <div class="pig-mark" style="width:70px;height:70px;margin:0 auto 13px;border-radius:23px"><img src="assets/pig.svg" alt=""></div>
            <h2 style="margin:0;font-size:22px">声账</h2>
            <p class="caption" style="margin:7px 0 0">说一句，就记好。</p>
          </div>
          <div class="detail-rows" style="margin-top:19px">
            <div class="detail-row"><span>原型版本</span><strong>v0.1 · 2026.10</strong></div>
            <div class="detail-row"><span>产品定位</span><strong>一句话语音记账</strong></div>
            <div class="detail-row"><span>数据策略</span><strong>本地优先 · 最小化云端</strong></div>
          </div>
          <div class="sheet-actions"><button class="btn btn-primary btn-block" type="button" data-action="close-modal">知道了</button></div>
        </div>
      </div>
    `;
  }

  function renderPrivacyPolicy() {
    return `
      <div class="modal-layer">
        <div class="sheet">
          <div class="sheet-handle"></div>
          <div class="sheet-head"><div><h2>隐私政策摘要</h2><p>正式上线前将由法律顾问复核完整版本。</p></div><button class="icon-button" type="button" data-action="close-modal" aria-label="关闭隐私政策">${icon("close", 20, 2)}</button></div>
          <div class="note-card" style="margin-top:0"><strong>语音数据</strong>录音仅用于当次转写与结构化解析，处理完立即丢弃。请求不带历史账单。</div>
          <div class="note-card"><strong>本机账本</strong>账单与分类保存在设备本地数据库，默认排除系统自动云备份。</div>
          <div class="note-card"><strong>微信账号</strong>登录用于标识云端备份归属，不读取通讯录和聊天记录。AppID 与密钥仅存储在服务端。</div>
          <div class="note-card"><strong>你的控制权</strong>可以随时导出全部数据、删除本机数据或关闭云备份。删除前会进行二次确认。</div>
          <div class="sheet-actions"><button class="btn btn-primary btn-block" type="button" data-action="close-modal">返回</button></div>
        </div>
      </div>
    `;
  }

  function renderModal() {
    if (!state.modal) return "";
    switch (state.modal.type) {
      case "voice":
        return renderVoice();
      case "editor":
        return `<div class="modal-layer full">${renderEditor()}</div>`;
      case "transaction":
        return renderTransactionDetail();
      case "filter":
        return renderFilter();
      case "day":
        return renderDayDetail();
      case "login":
      case "login-success":
        return renderLogin();
      case "conflict":
        return renderConflict();
      case "export":
        return renderExport();
      case "category-form":
        return renderCategoryForm();
      case "subcategory":
        return renderSubcategoryActions();
      case "about":
        return renderAbout();
      case "privacy-policy":
        return renderPrivacyPolicy();
      default:
        return "";
    }
  }

  function renderDialog() {
    if (!state.dialog) return "";
    return `
      <div class="confirm-layer">
        <div class="confirm-card">
          <span class="confirm-icon">${icon(state.dialog.icon || "alert", 22, 2)}</span>
          <h2>${esc(state.dialog.title)}</h2>
          <p>${esc(state.dialog.body)}</p>
          <div class="confirm-actions">
            <button class="btn btn-soft" type="button" data-action="dialog-cancel">${esc(state.dialog.cancelText || "取消")}</button>
            <button class="btn ${state.dialog.tone === "danger" ? "btn-danger" : "btn-primary"}" type="button" data-action="dialog-confirm">${esc(state.dialog.confirmText || "确认")}</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderUndo() {
    if (!state.undo) return "";
    return `
      <div class="undo-bar" role="status">
        <span>${state.undo.kind === "delete" ? `已删除 ${state.undo.count} 笔` : `已记入 ${state.undo.count} 笔`}</span>
        <button type="button" data-action="undo-voice">撤销</button>
        <i class="undo-progress"></i>
      </div>
    `;
  }

  function renderApp() {
    let screen = "";
    switch (state.screen) {
      case "onboarding":
        screen = renderOnboarding();
        break;
      case "ledger":
        screen = renderLedger();
        break;
      case "stats":
        screen = renderStats();
        break;
      case "settings":
        screen = renderSettings();
        break;
      case "categories":
        screen = renderCategories();
        break;
      case "account":
        screen = renderAccount();
        break;
      case "backup":
        screen = renderBackup();
        break;
      case "privacy":
        screen = renderPrivacy();
        break;
      default:
        screen = renderLedger();
    }
    app.innerHTML = `${screen}${renderModal()}${renderUndo()}${renderDialog()}`;
    bindVoiceGesture();
    if (state.screen === "categories") {
      const input = document.getElementById("categorySearchInput");
      if (input && document.activeElement !== input && state.focusCategorySearch) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    }
  }

  function navigate(screen, { reset = false } = {}) {
    if (reset) state.stack = [];
    if (state.screen !== screen) state.stack.push(state.screen);
    state.screen = screen;
    state.modal = null;
    renderApp();
  }

  function goBack() {
    state.modal = null;
    const previous = state.stack.pop();
    state.screen = previous && previous !== "onboarding" ? previous : "ledger";
    renderApp();
  }

  function toast(message, iconName = "check") {
    const element = document.createElement("div");
    element.className = "toast";
    element.innerHTML = `${icon(iconName, 15, 2.2)}<span>${esc(message)}</span>`;
    toastRegion.appendChild(element);
    setTimeout(() => {
      element.classList.add("out");
      setTimeout(() => element.remove(), 240);
    }, 2300);
  }

  function toLocalInput(iso) {
    const date = new Date(iso);
    const pad = (value) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function editorAmountFromCents(cents) {
    if (!cents) return "0";
    return (cents / 100).toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  }

  function openEditor({ txId = null, type = "expense", categoryId = null, note = "", subcategory = "", amount = 0 } = {}) {
    const transaction = txId ? state.transactions.find((item) => item.id === txId) : null;
    const chosenType = transaction ? transaction.type : type;
    const categories = currentCategoryList(chosenType);
    state.editor = transaction
      ? {
          txId,
          type: transaction.type,
          categoryId: transaction.categoryId,
          note: transaction.note || "",
          subcategory: transaction.subcategory || "",
          amount: editorAmountFromCents(transaction.amount),
          dateInput: toLocalInput(transaction.occurredAt)
        }
      : {
          txId: null,
          type: chosenType,
          categoryId: categoryId || categories[0].id,
          note,
          subcategory,
          amount: editorAmountFromCents(amount),
          dateInput: toLocalInput(now.toISOString())
        };
    state.modal = { type: "editor" };
    renderApp();
  }

  function openTransaction(id) {
    state.modal = { type: "transaction", id };
    renderApp();
  }

  function openVoice(sample = null) {
    clearTimeout(state.voiceTimer);
    if (!sample) {
      startDirectVoice();
      return;
    }
    state.voice = { phase: "parsing", sample };
    state.modal = { type: "voice" };
    renderApp();
    state.voiceTimer = setTimeout(() => finishVoiceParsing(sample), 1250);
  }

  function startDirectVoice() {
    clearTimeout(state.voiceTimer);
    state.voice = { phase: "recording" };
    state.modal = { type: "voice" };
    renderApp();
  }

  function beginVoiceParsing(sample = "multi") {
    clearTimeout(state.voiceTimer);
    state.voice = { phase: "parsing", sample };
    state.modal = { type: "voice" };
    renderApp();
    state.voiceTimer = setTimeout(() => finishVoiceParsing(sample), 1450);
  }

  function makeVoiceEntries(sample) {
    if (sample === "salary") {
      return {
        transcript: "发工资八千",
        entries: [
          {
            type: "income",
            amount: 800000,
            categoryId: "salary",
            subcategory: "月薪",
            note: "工资"
          }
        ]
      };
    }
    return {
      transcript: "午饭25，打车18",
      entries: [
        {
          type: "expense",
          amount: 2500,
          categoryId: "food",
          subcategory: "午餐",
          note: "午饭"
        },
        {
          type: "expense",
          amount: 1800,
          categoryId: "transport",
          subcategory: "打车",
          note: "打车"
        }
      ]
    };
  }

  function finishVoiceParsing(sample) {
    if (!state.voice || state.voice.phase !== "parsing") return;
    if (sample === "missing") {
      state.modal = null;
      state.voice = null;
      openEditor({ type: "expense", categoryId: "food", note: "咖啡", subcategory: "咖啡奶茶", amount: 0 });
      toast("还差一个金额，补上就好", "info");
      return;
    }
    const result = makeVoiceEntries(sample);
    state.voice = {
      phase: state.settings.autoPost ? "result" : "confirm",
      sample,
      transcript: result.transcript,
      entries: result.entries
    };
    if (state.settings.autoPost) {
      const ids = addVoiceTransactions(result.entries);
      startUndoWindow(ids);
    }
    renderApp();
  }

  function addVoiceTransactions(entries) {
    state.dataMode = "full";
    const ids = [];
    entries.forEach((entry, index) => {
      const id = `voice-${Date.now()}-${index}`;
      ids.push(id);
      state.transactions.push({
        id,
        type: entry.type,
        amount: entry.amount,
        categoryId: entry.categoryId,
        subcategory: entry.subcategory,
        note: entry.note,
        occurredAt: new Date(now.getTime() - index * 60000).toISOString(),
        source: "voice",
        createdAt: new Date().toISOString()
      });
    });
    return ids;
  }

  function startUndoWindow(ids) {
    clearTimeout(state.undoTimer);
    state.undo = { kind: "voice", ids, count: ids.length };
    state.undoTimer = setTimeout(() => {
      state.undo = null;
      renderApp();
    }, 8000);
  }

  function undoVoice() {
    if (!state.undo) return;
    if (state.undo.kind === "delete") {
      state.transactions.push(...state.undo.transactions);
      state.undo = null;
      clearTimeout(state.undoTimer);
      renderApp();
      toast("已恢复刚才删除的账单", "refresh");
      return;
    }
    const ids = new Set(state.undo.ids);
    state.transactions = state.transactions.filter((transaction) => !ids.has(transaction.id));
    state.undo = null;
    clearTimeout(state.undoTimer);
    if (state.modal && state.modal.type === "voice") state.modal = null;
    renderApp();
    toast("已撤销刚才的语音记账", "refresh");
  }

  function bindVoiceGesture() {
    const orb = document.getElementById("voiceOrb");
    if (!orb || !state.voice || state.voice.phase !== "idle") return;
    let startY = 0;
    let cancelArmed = false;
    let active = false;
    const title = document.getElementById("voiceTitle");
    const subtitle = document.getElementById("voiceSubtitle");
    const hint = document.getElementById("voiceHint");
    const wave = document.getElementById("voiceWave");

    const resetVisual = () => {
      orb.classList.remove("recording", "canceling");
      if (title) title.textContent = "按住，说一句";
      if (subtitle) subtitle.textContent = "例如：午饭 25，打车 18";
      if (hint) {
        hint.textContent = "松手完成 · 上滑取消";
        hint.classList.remove("cancel-hint");
      }
      if (wave) wave.style.opacity = ".28";
    };

    orb.addEventListener("pointerdown", (event) => {
      if (state.voice?.phase !== "idle") return;
      event.preventDefault();
      active = true;
      startY = event.clientY;
      cancelArmed = false;
      orb.setPointerCapture?.(event.pointerId);
      orb.classList.add("recording");
      if (title) title.textContent = "我在听，请说";
      if (subtitle) subtitle.textContent = "“午饭 25，打车 18”";
      if (hint) hint.textContent = "松手完成 · 上滑取消";
      if (wave) wave.style.opacity = "1";
    });

    orb.addEventListener("pointermove", (event) => {
      if (!active) return;
      cancelArmed = startY - event.clientY > 55;
      orb.classList.toggle("canceling", cancelArmed);
      if (hint) {
        hint.textContent = cancelArmed ? "松手取消这句话" : "松手完成 · 上滑取消";
        hint.classList.toggle("cancel-hint", cancelArmed);
      }
      if (title && cancelArmed) title.textContent = "松开就取消";
    });

    const release = (event) => {
      if (!active) return;
      active = false;
      orb.releasePointerCapture?.(event.pointerId);
      if (cancelArmed) {
        state.modal = null;
        state.voice = null;
        resetVisual();
        renderApp();
        toast("已取消，这句话没有记下来", "refresh");
        return;
      }
      beginVoiceParsing("multi");
    };

    orb.addEventListener("pointerup", release);
    orb.addEventListener("pointercancel", release);
  }

  function pressEditorKey(key) {
    if (!state.editor) return;
    let amount = state.editor.amount || "0";
    if (key === "backspace") {
      amount = amount.length > 1 ? amount.slice(0, -1) : "0";
      if (amount === ".") amount = "0";
    } else if (key === ".") {
      if (!amount.includes(".")) amount += ".";
    } else if (key === "00") {
      if (amount === "0") amount = "0";
      else if (!amount.includes(".") && amount.length < 7) amount += "00";
    } else if (/^\d$/.test(key)) {
      const [whole, decimal] = amount.split(".");
      if (decimal !== undefined && decimal.length >= 2) return;
      if (decimal === undefined && whole.length >= 7) return;
      amount = amount === "0" ? key : amount + key;
    }
    state.editor.amount = amount;
    renderApp();
  }

  function saveEditor() {
    if (!state.editor) return;
    const amountValue = Number(state.editor.amount || 0);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      toast("先输入一个金额", "info");
      return;
    }
    const dateInput = document.querySelector("[data-editor-date]");
    const noteInput = document.querySelector("[data-editor-note]");
    const dateValue = dateInput?.value ? new Date(dateInput.value) : new Date();
    const note = noteInput ? noteInput.value.trim() : state.editor.note.trim();
    const category = getCategory(state.editor.categoryId);
    const payload = {
      type: state.editor.type,
      amount: Math.round(amountValue * 100),
      categoryId: state.editor.categoryId,
      subcategory: state.editor.subcategory || category.subs[0] || category.name,
      note: note || category.name,
      occurredAt: Number.isNaN(dateValue.getTime()) ? new Date().toISOString() : dateValue.toISOString(),
      source: "manual",
      createdAt: new Date().toISOString()
    };
    if (state.editor.txId) {
      const transaction = state.transactions.find((item) => item.id === state.editor.txId);
      if (transaction) Object.assign(transaction, payload);
      toast("账单已更新");
    } else {
      state.transactions.push({ id: `manual-${Date.now()}`, ...payload });
      toast("已记好这一笔");
    }
    state.dataMode = "full";
    state.modal = null;
    state.editor = null;
    if (state.screen === "onboarding") state.screen = "ledger";
    renderApp();
  }

  function showConfirm({ title, body, confirmText = "确认", cancelText = "取消", tone = "primary", iconName = "alert", onConfirm }) {
    state.dialog = { title, body, confirmText, cancelText, tone, icon: iconName, onConfirm };
    renderApp();
  }

  function deleteTransaction(id) {
    const transaction = state.transactions.find((item) => item.id === id);
    if (!transaction) return;
    showConfirm({
      title: "删除这笔账单？",
      body: "删除后，本月统计会立即更新。这个操作无法撤销。",
      confirmText: "删除",
      tone: "danger",
      iconName: "trash",
      onConfirm: () => {
        state.transactions = state.transactions.filter((item) => item.id !== id);
        state.modal = null;
        state.dialog = null;
        clearTimeout(state.undoTimer);
        state.undo = { kind: "delete", transactions: [transaction], count: 1 };
        state.undoTimer = setTimeout(() => {
          state.undo = null;
          renderApp();
        }, 8000);
        renderApp();
        toast("账单已删除，8 秒内可撤销", "trash");
      }
    });
  }

  function performLogin() {
    state.user.loggedIn = true;
    state.user.backupEnabled = true;
    state.user.lastBackup = new Date().toISOString();
    state.modal = { type: "login-success" };
    renderApp();
  }

  function startBackup() {
    if (!state.user.loggedIn) {
      state.modal = { type: "login" };
      renderApp();
      return;
    }
    state.backupStatus = "backing_up";
    renderApp();
    setTimeout(() => {
      state.backupStatus = "idle";
      state.user.lastBackup = new Date().toISOString();
      renderApp();
      toast("云备份已完成");
    }, 1500);
  }

  function categoryOrder(id, direction) {
    const category = state.categories.find((item) => item.id === id);
    if (!category) return;
    const income = ["salary", "bonus", "side", "invest", "redpacket", "refund", "reimburse", "other-income"].includes(id);
    const peers = state.categories.filter((item) =>
      income
        ? ["salary", "bonus", "side", "invest", "redpacket", "refund", "reimburse", "other-income"].includes(item.id)
        : !["salary", "bonus", "side", "invest", "redpacket", "refund", "reimburse", "other-income"].includes(item.id)
    );
    const index = peers.indexOf(category);
    const target = peers[index + direction];
    if (!target) return;
    const sourceIndex = state.categories.indexOf(category);
    const targetIndex = state.categories.indexOf(target);
    [state.categories[sourceIndex], state.categories[targetIndex]] = [state.categories[targetIndex], state.categories[sourceIndex]];
    renderApp();
    toast("分类顺序已更新");
  }

  function openCategoryForm(categoryId = null) {
    const category = categoryId ? state.categories.find((item) => item.id === categoryId) : null;
    state.modal = {
      type: "category-form",
      form: category
        ? { mode: "edit", categoryId, name: category.name, parentId: "", hidden: category.hidden }
        : { mode: "create", categoryId: null, name: "", parentId: "", type: state.categoryTab }
    };
    renderApp();
  }

  function saveCategory() {
    if (!state.modal || state.modal.type !== "category-form") return;
    const form = state.modal.form;
    const nameInput = document.getElementById("categoryName");
    const parentSelect = document.getElementById("categoryParent");
    const name = (nameInput?.value || form.name).trim();
    const parentId = parentSelect?.value || "";
    if (!name) {
      toast("给分类起个名字吧", "info");
      nameInput?.focus();
      return;
    }
    if (form.mode === "edit") {
      const category = state.categories.find((item) => item.id === form.categoryId);
      if (category) {
        if (parentId) {
          const parent = state.categories.find((item) => item.id === parentId);
          if (parent && !parent.subs.includes(name)) parent.subs.push(name);
        } else {
          category.name = name;
        }
      }
      toast("分类已更新");
    } else if (parentId) {
      const parent = state.categories.find((item) => item.id === parentId);
      if (parent && !parent.subs.includes(name)) parent.subs.push(name);
      toast(`已添加到「${parent?.name || "分类"}」`);
    } else {
      const id = `custom-${Date.now()}`;
      state.categories.push({
        id,
        name,
        icon: "more",
        bg: "#ece8e4",
        fg: "#80776f",
        subs: ["其他"],
        archived: false,
        hidden: false,
        custom: true
      });
      toast("新分类已创建");
    }
    state.modal = null;
    renderApp();
  }

  function exportData(format) {
    let content = "";
    let mime = "";
    let filename = "";
    if (format === "json") {
      content = JSON.stringify(
        {
          app: "声账",
          schemaVersion: 1,
          exportedAt: new Date().toISOString(),
          transactions: state.transactions,
          categories: state.categories,
          settings: state.settings
        },
        null,
        2
      );
      mime = "application/json;charset=utf-8";
      filename = `声账-备份-${new Date().toISOString().slice(0, 10)}.json`;
    } else {
      const rows = [
        ["日期", "类型", "金额", "一级分类", "二级分类", "备注", "来源"],
        ...state.transactions.map((transaction) => [
          new Date(transaction.occurredAt).toLocaleString("zh-CN"),
          transaction.type === "income" ? "收入" : "支出",
          (transaction.amount / 100).toFixed(2),
          getCategory(transaction.categoryId).name,
          transaction.subcategory || "",
          transaction.note || "",
          transaction.source === "voice" ? "语音" : "手动"
        ])
      ];
      content = "\uFEFF" + rows
        .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
        .join("\n");
      mime = "text/csv;charset=utf-8";
      filename = `声账-账单-${new Date().toISOString().slice(0, 10)}.csv`;
    }
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    state.modal = null;
    renderApp();
    toast(`${format.toUpperCase()} 文件已导出`, "download");
  }

  const scenarioData = [
    {
      group: "首次体验",
      items: [
        ["首次引导", "onboarding"],
        ["空账本", "empty-ledger"]
      ]
    },
    {
      group: "核心记账",
      items: [
        ["账本首页", "home"],
        ["语音 · 一句话多笔", "voice-auto"],
        ["语音 · 先确认", "voice-confirm"],
        ["缺金额修正", "voice-missing"],
        ["手动记账", "manual-entry"],
        ["账单筛选", "filter"],
        ["月度统计", "stats"],
        ["某日明细", "day-detail"]
      ]
    },
    {
      group: "账号与数据",
      items: [
        ["微信登录", "login"],
        ["已登录账号", "account"],
        ["云备份", "backup"],
        ["备份失败", "backup-failed"],
        ["换机恢复冲突", "conflict"],
        ["导出账本", "export"]
      ]
    },
    {
      group: "设置与异常",
      items: [
        ["分类管理", "categories"],
        ["设置首页", "settings"],
        ["隐私与权限", "privacy"],
        ["网络失败", "error-network"],
        ["额度耗尽", "error-quota"],
        ["麦克风拒绝", "error-mic"]
      ]
    }
  ];

  function renderScenarioPanel() {
    scenarioGroups.innerHTML = scenarioData
      .map(
        (group) => `
          <section class="scenario-group">
            <h3>${group.group}</h3>
            ${group.items.map(([label, id]) => `<button class="scenario-item" type="button" data-scenario="${id}">${label}</button>`).join("")}
          </section>
        `
      )
      .join("");
  }

  function toggleScenario(force) {
    const open = typeof force === "boolean" ? force : !scenarioPanel.classList.contains("open");
    scenarioPanel.classList.toggle("open", open);
    scenarioPanel.setAttribute("aria-hidden", String(!open));
    scenarioToggle.setAttribute("aria-expanded", String(open));
  }

  function setContentBase() {
    clearTimeout(state.voiceTimer);
    state.modal = null;
    state.editor = null;
    state.voice = null;
    state.dialog = null;
    state.backupStatus = "idle";
  }

  function applyScenario(id) {
    setContentBase();
    switch (id) {
      case "onboarding":
        resetState();
        break;
      case "empty-ledger":
        state.screen = "ledger";
        state.stack = ["ledger"];
        state.dataMode = "empty";
        state.transactions = [];
        break;
      case "home":
        loadDemoData();
        state.screen = "ledger";
        state.stack = ["ledger"];
        break;
      case "voice-auto":
        loadDemoData();
        state.screen = "ledger";
        state.stack = ["ledger"];
        state.settings.autoPost = true;
        openVoice();
        state.voiceTimer = setTimeout(() => beginVoiceParsing("multi"), 380);
        break;
      case "voice-confirm":
        loadDemoData();
        state.screen = "ledger";
        state.stack = ["ledger"];
        state.settings.autoPost = false;
        openVoice();
        state.voiceTimer = setTimeout(() => beginVoiceParsing("multi"), 380);
        break;
      case "voice-missing":
        loadDemoData();
        state.screen = "ledger";
        state.stack = ["ledger"];
        openVoice("missing");
        break;
      case "manual-entry":
        loadDemoData();
        state.screen = "ledger";
        state.stack = ["ledger"];
        openEditor();
        break;
      case "filter":
        loadDemoData();
        state.screen = "ledger";
        state.stack = ["ledger"];
        state.modal = { type: "filter" };
        break;
      case "stats":
        loadDemoData();
        state.screen = "stats";
        state.stack = ["ledger"];
        break;
      case "day-detail":
        loadDemoData();
        state.screen = "stats";
        state.stack = ["ledger"];
        state.modal = { type: "day", day: Math.max(1, now.getDate() - 1) };
        break;
      case "login":
        loadDemoData();
        state.screen = "settings";
        state.stack = ["ledger"];
        state.modal = { type: "login" };
        break;
      case "account":
        loadDemoData();
        state.user.loggedIn = true;
        state.user.backupEnabled = true;
        state.user.lastBackup = new Date().toISOString();
        state.screen = "account";
        state.stack = ["ledger", "settings"];
        break;
      case "backup":
        loadDemoData();
        state.user.loggedIn = true;
        state.user.backupEnabled = true;
        state.user.lastBackup = new Date(now.getTime() - 2 * 3600000).toISOString();
        state.screen = "backup";
        state.stack = ["ledger", "settings"];
        break;
      case "conflict":
        loadDemoData();
        state.user.loggedIn = true;
        state.user.backupEnabled = true;
        state.user.lastBackup = new Date(now.getTime() - 2 * 3600000).toISOString();
        state.screen = "backup";
        state.stack = ["ledger", "settings"];
        state.modal = { type: "conflict" };
        break;
      case "backup-failed":
        loadDemoData();
        state.user.loggedIn = true;
        state.user.backupEnabled = true;
        state.user.lastBackup = new Date(now.getTime() - 26 * 3600000).toISOString();
        state.backupStatus = "failed";
        state.screen = "backup";
        state.stack = ["ledger", "settings"];
        break;
      case "export":
        loadDemoData();
        state.screen = "settings";
        state.stack = ["ledger"];
        state.modal = { type: "export" };
        break;
      case "categories":
        loadDemoData();
        state.screen = "categories";
        state.stack = ["ledger", "settings"];
        break;
      case "settings":
        loadDemoData();
        state.screen = "settings";
        state.stack = ["ledger"];
        break;
      case "privacy":
        loadDemoData();
        state.screen = "privacy";
        state.stack = ["ledger", "settings"];
        break;
      case "error-network":
      case "error-quota":
      case "error-mic":
        loadDemoData();
        state.screen = "ledger";
        state.stack = ["ledger"];
        state.voice = {
          phase: "error",
          error: id === "error-network" ? "network" : id === "error-quota" ? "quota" : "microphone"
        };
        state.modal = { type: "voice" };
        break;
      default:
        break;
    }
    renderApp();
    toggleScenario(false);
    if (new URLSearchParams(location.search).get("capture") === "1") {
      document.body.classList.add("capture");
    }
  }

  app.addEventListener("click", (event) => {
    const actionTarget = event.target.closest("[data-action]");
    if (!actionTarget) return;
    const action = actionTarget.dataset.action;

    switch (action) {
      case "finish-onboarding":
        state.screen = "ledger";
        state.stack = ["ledger"];
        renderApp();
        break;
      case "skip-onboarding":
        state.screen = "ledger";
        state.stack = ["ledger"];
        renderApp();
        break;
      case "try-demo":
        loadDemoData();
        state.screen = "ledger";
        state.stack = ["ledger"];
        renderApp();
        toast("已载入一组演示账单");
        break;
      case "nav-ledger":
        state.screen = "ledger";
        state.stack = ["ledger"];
        renderApp();
        break;
      case "nav-stats":
        state.screen = "stats";
        state.stack = ["ledger"];
        renderApp();
        break;
      case "nav-settings":
        navigate("settings");
        break;
      case "go-back":
        goBack();
        break;
      case "month-prev":
        state.selectedMonth = new Date(state.selectedMonth.getFullYear(), state.selectedMonth.getMonth() - 1, 1);
        renderApp();
        break;
      case "month-next":
        state.selectedMonth = new Date(state.selectedMonth.getFullYear(), state.selectedMonth.getMonth() + 1, 1);
        renderApp();
        break;
      case "open-voice":
        if (state.screen === "onboarding") {
          state.screen = "ledger";
          state.stack = ["ledger"];
        }
        if (state.modal?.type === "voice") break;
        // Keyboard and assistive activation has no pointerdown/up pair.
        // Start listening visually, then submit the prototype sample.
        startDirectVoice();
        state.voiceTimer = setTimeout(() => beginVoiceParsing("multi"), 720);
        break;
      case "voice-orb":
        if (event.detail === 0) beginVoiceParsing("multi");
        break;
      case "voice-sample":
        beginVoiceParsing(actionTarget.dataset.sample);
        break;
      case "voice-retry":
        beginVoiceParsing("multi");
        break;
      case "close-voice":
        state.modal = null;
        state.voice = null;
        renderApp();
        break;
      case "open-ledger-after-voice":
        state.modal = null;
        state.voice = null;
        state.screen = "ledger";
        state.stack = ["ledger"];
        renderApp();
        break;
      case "voice-confirm": {
        const ids = addVoiceTransactions(state.voice.entries);
        state.modal = null;
        state.voice = null;
        startUndoWindow(ids);
        renderApp();
        toast(`已确认 ${ids.length} 笔账单`);
        break;
      }
      case "voice-edit":
        {
          const entry = state.voice?.entries?.[0];
          state.modal = null;
          state.voice = null;
          openEditor(entry ? {
            type: entry.type,
            categoryId: entry.categoryId,
            note: entry.note,
            subcategory: entry.subcategory,
            amount: entry.amount
          } : {});
        }
        break;
      case "voice-edit-entry": {
        const entry = state.voice?.entries?.[Number(actionTarget.dataset.index)];
        state.modal = null;
        state.voice = null;
        openEditor(entry ? {
          type: entry.type,
          categoryId: entry.categoryId,
          note: entry.note,
          subcategory: entry.subcategory,
          amount: entry.amount
        } : {});
        break;
      }
      case "undo-voice":
        undoVoice();
        break;
      case "open-editor":
        if (state.voice) {
          state.voice = null;
          state.modal = null;
        }
        openEditor();
        break;
      case "open-filter":
        state.modal = { type: "filter" };
        renderApp();
        break;
      case "filter-type":
        state.filter.type = actionTarget.dataset.type;
        if (state.filter.category !== "all") {
          const category = getCategory(state.filter.category);
          const incomeIds = ["salary", "bonus", "side", "invest", "redpacket", "refund", "reimburse", "other-income"];
          if (state.filter.type !== "all" && incomeIds.includes(category.id) !== (state.filter.type === "income")) {
            state.filter.category = "all";
          }
        }
        renderApp();
        break;
      case "filter-category":
        state.filter.category = actionTarget.dataset.id;
        renderApp();
        break;
      case "clear-filter":
        state.filter = { type: "all", category: "all" };
        state.modal = null;
        renderApp();
        toast("筛选条件已清空", "filter");
        break;
      case "open-today":
        state.modal = { type: "day", day: now.getDate() };
        renderApp();
        break;
      case "open-day":
        state.modal = { type: "day", day: Number(actionTarget.dataset.day) };
        renderApp();
        break;
      case "open-transaction":
        openTransaction(actionTarget.dataset.id);
        break;
      case "edit-transaction":
        openEditor({ txId: actionTarget.dataset.id });
        break;
      case "delete-transaction":
        deleteTransaction(actionTarget.dataset.id);
        break;
      case "close-modal":
        state.modal = null;
        state.editor = null;
        renderApp();
        break;
      case "editor-type": {
        const type = actionTarget.dataset.type;
        if (state.editor.type !== type) {
          state.editor.type = type;
          state.editor.categoryId = currentCategoryList(type)[0].id;
          state.editor.subcategory = "";
          renderApp();
        }
        break;
      }
      case "editor-category": {
        const category = getCategory(actionTarget.dataset.id);
        state.editor.categoryId = category.id;
        state.editor.subcategory = category.subs[0] || category.name;
        renderApp();
        break;
      }
      case "editor-subcategory":
        state.editor.subcategory = actionTarget.dataset.value;
        renderApp();
        break;
      case "editor-key":
        pressEditorKey(actionTarget.dataset.key);
        break;
      case "editor-focus-date":
        document.getElementById("entryDate")?.focus();
        break;
      case "editor-focus-note":
        document.getElementById("entryNote")?.focus();
        break;
      case "save-editor":
        saveEditor();
        break;
      case "delete-editor":
        if (state.editor?.txId) {
          state.modal = { type: "transaction", id: state.editor.txId };
          deleteTransaction(state.editor.txId);
        }
        break;
      case "open-login":
        state.modal = { type: "login" };
        renderApp();
        break;
      case "allow-login":
        performLogin();
        break;
      case "finish-login":
        state.modal = null;
        state.screen = "account";
        state.stack = ["ledger", "settings"];
        renderApp();
        toast("微信登录成功，云备份已开启");
        break;
      case "logout":
        showConfirm({
          title: "退出微信登录？",
          body: "本机账本会完整保留，只会停止后续云备份。",
          confirmText: "退出登录",
          iconName: "logout",
          onConfirm: () => {
            state.user.loggedIn = false;
            state.user.backupEnabled = false;
            state.dialog = null;
            renderApp();
            toast("已退出登录，本机账单仍在", "logout");
          }
        });
        break;
      case "nav-account":
        navigate("account");
        break;
      case "nav-backup":
        navigate("backup");
        break;
      case "nav-privacy":
        navigate("privacy");
        break;
      case "toggle-auto-post":
        state.settings.autoPost = !state.settings.autoPost;
        renderApp();
        toast(state.settings.autoPost ? "语音识别后将直接入账" : "语音识别后先确认");
        break;
      case "toggle-voice-tips":
        state.settings.voiceTips = !state.settings.voiceTips;
        renderApp();
        break;
      case "toggle-backup":
        state.user.backupEnabled = !state.user.backupEnabled;
        renderApp();
        toast(state.user.backupEnabled ? "自动云备份已开启" : "自动云备份已关闭", "cloud");
        break;
      case "backup-now":
        startBackup();
        break;
      case "open-conflict":
        state.modal = { type: "conflict" };
        renderApp();
        break;
      case "merge-backup":
        state.user.lastBackup = new Date().toISOString();
        state.modal = null;
        renderApp();
        toast("已合并两边账单，本机记录全部保留");
        break;
      case "use-cloud":
        state.user.lastBackup = new Date().toISOString();
        state.modal = null;
        renderApp();
        toast("已使用云端版本恢复", "cloud");
        break;
      case "open-export":
        state.modal = { type: "export" };
        renderApp();
        break;
      case "export-json":
        exportData("json");
        break;
      case "export-csv":
        exportData("csv");
        break;
      case "import-json":
        document.getElementById("importBackupInput")?.click();
        break;
      case "nav-categories":
        navigate("categories");
        break;
      case "category-tab":
        state.categoryTab = actionTarget.dataset.tab;
        state.categorySearch = "";
        state.focusCategorySearch = false;
        renderApp();
        break;
      case "add-category":
        openCategoryForm();
        break;
      case "edit-category":
        openCategoryForm(actionTarget.dataset.id);
        break;
      case "edit-subcategory":
        state.modal = {
          type: "subcategory",
          categoryId: actionTarget.dataset.id,
          index: Number(actionTarget.dataset.index)
        };
        renderApp();
        break;
      case "save-subcategory": {
        const category = state.categories.find((item) => item.id === state.modal.categoryId);
        const value = document.getElementById("subcategoryName")?.value.trim() || "";
        if (!category || !value) {
          toast("子分类名称不能为空", "info");
          break;
        }
        category.subs[state.modal.index] = value;
        state.modal = null;
        renderApp();
        toast("子分类已更新");
        break;
      }
      case "archive-subcategory": {
        const category = state.categories.find((item) => item.id === state.modal.categoryId);
        if (category) category.subs.splice(state.modal.index, 1);
        state.modal = null;
        renderApp();
        toast("子分类已归档，历史账单不受影响");
        break;
      }
      case "category-order":
        categoryOrder(actionTarget.dataset.id, Number(actionTarget.dataset.direction));
        break;
      case "save-category":
        saveCategory();
        break;
      case "category-visibility": {
        const category = state.categories.find((item) => item.id === state.modal.form.categoryId);
        if (category) {
          category.hidden = !category.hidden;
          state.modal.form.hidden = category.hidden;
          renderApp();
          toast(category.hidden ? "分类已隐藏" : "分类已显示");
        }
        break;
      }
      case "category-archive": {
        const category = state.categories.find((item) => item.id === state.modal.form.categoryId);
        if (category) {
          category.archived = true;
          state.modal = null;
          renderApp();
          toast("分类已归档，历史账单保持不变");
        }
        break;
      }
      case "open-about":
        state.modal = { type: "about" };
        renderApp();
        break;
      case "open-privacy-policy":
        state.modal = { type: "privacy-policy" };
        renderApp();
        break;
      case "request-mic":
        state.modal = null;
        state.voice = null;
        renderApp();
        toast("原型不会调用真实系统设置", "info");
        break;
      case "privacy-local":
        toast("本机数据库默认排除系统自动云备份", "shield");
        break;
      case "delete-all":
        showConfirm({
          title: "永久删除全部账本？",
          body: "本机账单、分类修改和设置都会被清空。建议先导出 JSON 备份。",
          confirmText: "确认删除",
          tone: "danger",
          iconName: "trash",
          onConfirm: () => {
            state.transactions = [];
            state.dataMode = "empty";
            state.dialog = null;
            state.modal = null;
            state.screen = "ledger";
            state.stack = ["ledger"];
            renderApp();
            toast("全部账本数据已删除", "trash");
          }
        });
        break;
      case "dialog-confirm": {
        const callback = state.dialog?.onConfirm;
        state.dialog = null;
        if (callback) callback();
        break;
      }
      case "dialog-cancel":
        state.dialog = null;
        renderApp();
        break;
      case "year-soon":
        toast("年度统计会在 MVP 后继续打磨", "info");
        break;
      default:
        break;
    }
  });

  app.addEventListener("input", (event) => {
    if (event.target.matches("[data-search-categories]")) {
      state.categorySearch = event.target.value;
      state.focusCategorySearch = true;
      renderApp();
    }
    if (event.target.matches("[data-category-name]") && state.modal?.type === "category-form") {
      state.modal.form.name = event.target.value;
    }
    if (event.target.matches("[data-category-parent]") && state.modal?.type === "category-form") {
      state.modal.form.parentId = event.target.value;
    }
    if (event.target.matches("[data-editor-date]") && state.editor) {
      state.editor.dateInput = event.target.value;
    }
    if (event.target.matches("[data-editor-note]") && state.editor) {
      state.editor.note = event.target.value;
    }
  });

  app.addEventListener("change", async (event) => {
    if (!event.target.matches("#importBackupInput")) return;
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!Array.isArray(parsed.transactions)) throw new Error("缺少 transactions 数组");
      state.transactions = parsed.transactions;
      if (Array.isArray(parsed.categories) && parsed.categories.length) {
        state.categories = parsed.categories.map((category) => ({
          ...category,
          subs: Array.isArray(category.subs) ? category.subs : []
        }));
      }
      if (parsed.settings && typeof parsed.settings === "object") {
        state.settings = { ...state.settings, ...parsed.settings };
      }
      state.dataMode = state.transactions.length ? "full" : "empty";
      state.modal = null;
      state.screen = "ledger";
      state.stack = ["ledger"];
      renderApp();
      toast(`已恢复 ${state.transactions.length} 笔账单`);
    } catch (error) {
      toast("备份文件格式不正确，请选择声账导出的 JSON", "alert");
    } finally {
      event.target.value = "";
    }
  });

  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-scenario]")) {
      applyScenario(event.target.closest("[data-scenario]").dataset.scenario);
    }
  });

  document.addEventListener("pointerdown", (event) => {
    const trigger = event.target.closest('[data-action="open-voice"]');
    if (!trigger || state.modal?.type === "voice" || event.button !== 0) return;
    event.preventDefault();
    if (state.screen === "onboarding") {
      state.screen = "ledger";
      state.stack = ["ledger"];
    }
    directVoiceGesture = {
      startY: event.clientY,
      cancelArmed: false,
      pointerId: event.pointerId
    };
    startDirectVoice();
  });

  document.addEventListener("pointermove", (event) => {
    if (!directVoiceGesture || event.pointerId !== directVoiceGesture.pointerId) return;
    const cancelArmed = directVoiceGesture.startY - event.clientY > 55;
    directVoiceGesture.cancelArmed = cancelArmed;
    const orb = document.querySelector(".voice-orb.recording");
    const title = document.getElementById("voiceTitle");
    const hint = document.getElementById("voiceHint");
    orb?.classList.toggle("canceling", cancelArmed);
    if (title) title.textContent = cancelArmed ? "松开就取消" : "我在听，请说";
    if (hint) {
      hint.textContent = cancelArmed ? "松手取消这句话" : "松开完成 · 上滑取消";
      hint.classList.toggle("cancel-hint", cancelArmed);
    }
  });

  const finishDirectVoice = (event) => {
    if (!directVoiceGesture || (event?.pointerId != null && event.pointerId !== directVoiceGesture.pointerId)) return;
    const canceled = directVoiceGesture.cancelArmed;
    directVoiceGesture = null;
    if (canceled) {
      state.modal = null;
      state.voice = null;
      renderApp();
      toast("已取消，这句话没有记下来", "refresh");
      return;
    }
    beginVoiceParsing("multi");
  };

  document.addEventListener("pointerup", finishDirectVoice);
  document.addEventListener("pointercancel", finishDirectVoice);

  scenarioToggle.addEventListener("click", () => toggleScenario());
  document.getElementById("scenarioClose").innerHTML = icon("close", 19, 2);
  document.getElementById("scenarioClose").addEventListener("click", () => toggleScenario(false));
  document.getElementById("resetDemo").addEventListener("click", () => {
    resetState();
    renderApp();
    toggleScenario(false);
    toast("演示已重置");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key.toLowerCase() === "d" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) {
      event.preventDefault();
      toggleScenario();
    }
    if (event.key === "Escape") {
      if (state.dialog) {
        state.dialog = null;
        renderApp();
      } else if (state.modal) {
        state.modal = null;
        state.voice = null;
        state.editor = null;
        renderApp();
      } else if (scenarioPanel.classList.contains("open")) {
        toggleScenario(false);
      }
    }
  });

  renderStatusBar();
  renderScenarioPanel();
  renderApp();

  const params = new URLSearchParams(location.search);
  if (params.get("capture") === "1") {
    document.body.classList.add("capture");
  }
  const scenario = params.get("scenario");
  if (scenario) {
    setTimeout(() => applyScenario(scenario), 40);
  }
})();
