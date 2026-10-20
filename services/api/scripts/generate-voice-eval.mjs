import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(scriptDir, '../testdata/voice/cases.json');

const expenseCatalog = [
  ['早餐买了包子和豆浆', ['餐饮', '早餐']],
  ['中午吃午饭', ['餐饮', '午餐']],
  ['晚上吃晚饭', ['餐饮', '晚餐']],
  ['买了一杯咖啡', ['餐饮', '咖啡奶茶']],
  ['点了一杯奶茶', ['餐饮', '咖啡奶茶']],
  ['点了一份外卖', ['餐饮', '外卖']],
  ['买了水果', ['餐饮', '水果零食']],
  ['买了零食', ['餐饮', '水果零食']],
  ['和朋友聚餐', ['餐饮', '聚餐']],
  ['坐公交上班', ['交通', '公交地铁']],
  ['坐地铁回家', ['交通', '公交地铁']],
  ['打车去公司', ['交通', '打车']],
  ['打车回家', ['交通', '打车']],
  ['给车加油', ['交通', '加油充电']],
  ['充电桩充电', ['交通', '加油充电']],
  ['商场停车', ['交通', '停车']],
  ['买了高铁票', ['交通', '火车飞机']],
  ['骑共享单车', ['交通', '单车']],
  ['买了一件衣服', ['购物', '服饰']],
  ['买了日用品', ['购物', '日用品']],
  ['买了一个键盘', ['购物', '数码']],
  ['买了护肤品', ['购物', '美妆个护']],
  ['买了家居用品', ['购物', '家居']],
  ['交房租', ['居住', '房租']],
  ['交水电费', ['居住', '水电燃气']],
  ['交物业费', ['居住', '物业']],
  ['修了水龙头', ['居住', '维修']],
  ['看电影', ['娱乐', '电影演出']],
  ['买了游戏', ['娱乐', '游戏']],
  ['续费视频会员', ['娱乐', '会员订阅']],
  ['旅行订了民宿', ['旅行', '住宿']],
  ['看了一场电影', ['娱乐', '电影演出']],
  ['去医院看门诊', ['医疗健康', '门诊']],
  ['去药店买药', ['医疗健康', '药品']],
  ['做了体检', ['医疗健康', '体检']],
  ['交保险费', ['医疗健康', '保险']],
  ['买了两本书', ['学习教育', '书籍']],
  ['报名线上课程', ['学习教育', '课程']],
  ['交考试报名费', ['学习教育', '考试']],
  ['购买文具', ['学习教育', '文具']],
  ['发了红包', ['人情礼物', '红包']],
  ['买了一份礼物', ['人情礼物', '礼物']],
  ['和朋友聚餐', ['餐饮', '聚餐']],
  ['给父母生活费', ['人情礼物', '孝敬']],
  ['交话费', ['通讯网络', '话费']],
  ['交宽带费', ['通讯网络', '宽带']],
  ['续费云服务器', ['通讯网络', '云服务']],
  ['买了猫粮', ['宠物', '主粮零食']],
  ['带猫看病', ['宠物', '医疗']],
  ['买了宠物用品', ['宠物', '用品']],
  ['宠物洗澡', ['宠物', '服务']],
  ['订了羽毛球场地', ['运动', '场地']],
  ['买了运动鞋', ['运动', '装备']],
  ['报名健身课', ['运动', '课程']],
  ['订了酒店', ['旅行', '住宿']],
  ['买了景区门票', ['旅行', '门票']],
  ['旅行途中打车', ['旅行', '交通']],
  ['旅行购买景区门票', ['旅行', '门票']],
  ['交了一笔杂费', ['其他', '其他']],
];

const incomeCatalog = [
  ['发工资', ['工资']],
  ['收到奖金', ['奖金']],
  ['收到兼职工资', ['兼职']],
  ['收到理财收益', ['理财收益']],
  ['收到生日红包', ['红包']],
  ['收到退款', ['退款']],
  ['公司报销到账', ['报销']],
  ['收到一笔转账', ['其他']],
];

const amounts = [800, 650, 1200, 1800, 2500, 2600, 3050, 3200, 4680, 5000, 6500, 8800, 12000, 12800, 20000];
const dateRules = ['today', 'yesterday', 'dayBefore', 'oct5'];
const dateText = {
  today: '今天',
  yesterday: '昨天',
  dayBefore: '前天',
  oct5: '10月5号',
};

function spokenAmount(amountMinor, style = 0) {
  const yuan = Math.floor(amountMinor / 100);
  const cents = amountMinor % 100;
  if (cents === 0) return style % 2 === 0 ? `${yuan}块` : `${yuan}元`;
  if (cents === 50) return `${yuan}块五`;
  if (cents < 10) return `${yuan}块零${cents}`;
  if (cents % 10 === 0) return `${yuan}块${cents / 10}`;
  return `${yuan}块${Math.floor(cents / 10)}毛${cents % 10}`;
}

function expenseCase(item, amountMinor, style) {
  return {
    type: 'expense',
    amountMinor,
    categoryPath: item[1],
    phrase: item[0],
    amountText: spokenAmount(amountMinor, style),
  };
}

function makeCase(id, utterance, expected, tags) {
  return { id, utterance, expected, tags };
}

const cases = [];

for (let index = 0; index < 70; index += 1) {
  const item = expenseCatalog[index % expenseCatalog.length];
  const amountMinor = amounts[index % amounts.length];
  const dateRule = index % 7 === 0 ? dateRules[index % dateRules.length] : null;
  const entry = expenseCase(item, amountMinor, index);
  cases.push(
    makeCase(
      `single-${String(index + 1).padStart(3, '0')}`,
      `${dateRule ? dateText[dateRule] : ''}${entry.phrase}${entry.amountText}`,
      [
        {
          type: 'expense',
          amountMinor,
          categoryPath: entry.categoryPath,
          dateRule,
        },
      ],
      ['single', 'expense'],
    ),
  );
}

for (let index = 0; index < 25; index += 1) {
  const item = incomeCatalog[index % incomeCatalog.length];
  const amountMinor = amounts[(index + 4) % amounts.length];
  cases.push(
    makeCase(
      `income-${String(index + 1).padStart(3, '0')}`,
      `${item[0]}${spokenAmount(amountMinor, index)}`,
      [{ type: 'income', amountMinor, categoryPath: item[1] }],
      ['single', 'income'],
    ),
  );
}

for (let index = 0; index < 45; index += 1) {
  const first = expenseCatalog[(index * 3) % expenseCatalog.length];
  const second = expenseCatalog[(index * 3 + 11) % expenseCatalog.length];
  const firstAmount = amounts[(index + 2) % amounts.length];
  const secondAmount = amounts[(index + 8) % amounts.length];
  const firstEntry = expenseCase(first, firstAmount, index);
  const secondEntry = expenseCase(second, secondAmount, index + 1);
  const entries = [firstEntry, secondEntry];
  if (index % 3 === 0) {
    const third = expenseCatalog[(index * 3 + 23) % expenseCatalog.length];
    entries.push(expenseCase(third, amounts[(index + 12) % amounts.length], index + 2));
  }
  cases.push(
    makeCase(
      `multi-${String(index + 1).padStart(3, '0')}`,
      entries.map((entry) => `${entry.phrase}${entry.amountText}`).join('，然后'),
      entries.map((entry) => ({
        type: 'expense',
        amountMinor: entry.amountMinor,
        categoryPath: entry.categoryPath,
      })),
      ['multi', 'expense'],
    ),
  );
}

for (let index = 0; index < 30; index += 1) {
  const item = expenseCatalog[(index + 17) % expenseCatalog.length];
  const amountMinor = [3050, 3250, 1800, 4680, 650][index % 5];
  const entry = expenseCase(item, amountMinor, index);
  cases.push(
    makeCase(
      `amount-${String(index + 1).padStart(3, '0')}`,
      `${entry.phrase}${entry.amountText}`,
      [{ type: 'expense', amountMinor, categoryPath: entry.categoryPath }],
      ['amount'],
    ),
  );
}

for (let index = 0; index < 20; index += 1) {
  const item = expenseCatalog[(index * 5 + 3) % expenseCatalog.length];
  const amountMinor = amounts[(index + 6) % amounts.length];
  const dateRule = dateRules[index % dateRules.length];
  cases.push(
    makeCase(
      `date-${String(index + 1).padStart(3, '0')}`,
      `${dateText[dateRule]}${item[0]}${spokenAmount(amountMinor, index)}`,
      [
        {
          type: 'expense',
          amountMinor,
          categoryPath: item[1],
          dateRule,
        },
      ],
      ['date'],
    ),
  );
}

for (let index = 0; index < 10; index += 1) {
  const item = expenseCatalog[(index * 7 + 2) % expenseCatalog.length];
  cases.push(
    makeCase(
      `missing-${String(index + 1).padStart(3, '0')}`,
      item[0],
      [{ type: 'expense', categoryPath: item[1], missingAmount: true }],
      ['missing-amount'],
    ),
  );
}

if (cases.length !== 200) throw new Error(`Expected 200 cases, got ${cases.length}`);
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify({ version: 1, cases }, null, 2)}\n`);
console.log(`Wrote ${cases.length} cases to ${outputPath}`);
