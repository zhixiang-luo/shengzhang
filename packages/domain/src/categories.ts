import type { TransactionType } from './transaction';

export interface DefaultCategorySeed {
  id: string;
  name: string;
  type: TransactionType;
  parentId: string | null;
  icon: string;
  color: string;
  sortOrder: number;
}

interface CategoryGroup {
  id: string;
  name: string;
  icon: string;
  color: string;
  children: Array<{ name: string; icon: string }>;
}

const EXPENSE_GROUPS: CategoryGroup[] = [
  {
    id: 'expense-food',
    name: '餐饮',
    icon: 'food',
    color: '#E89A96',
    children: [
      { name: '早餐', icon: 'breakfast' },
      { name: '午餐', icon: 'lunch' },
      { name: '晚餐', icon: 'dinner' },
      { name: '咖啡奶茶', icon: 'coffee' },
      { name: '外卖', icon: 'takeout' },
      { name: '水果零食', icon: 'snack' },
      { name: '聚餐', icon: 'dining' },
    ],
  },
  {
    id: 'expense-transport',
    name: '交通',
    icon: 'transport',
    color: '#D7A66F',
    children: [
      { name: '公交地铁', icon: 'transit' },
      { name: '打车', icon: 'taxi' },
      { name: '加油充电', icon: 'fuel' },
      { name: '停车', icon: 'parking' },
      { name: '火车飞机', icon: 'train' },
      { name: '单车', icon: 'bike' },
    ],
  },
  {
    id: 'expense-shopping',
    name: '购物',
    icon: 'shopping',
    color: '#C99187',
    children: [
      { name: '服饰', icon: 'clothing' },
      { name: '日用品', icon: 'daily' },
      { name: '数码', icon: 'digital' },
      { name: '美妆个护', icon: 'beauty' },
      { name: '家居', icon: 'household' },
    ],
  },
  {
    id: 'expense-home',
    name: '居住',
    icon: 'home',
    color: '#A78870',
    children: [
      { name: '房租', icon: 'rent' },
      { name: '水电燃气', icon: 'utilities' },
      { name: '物业', icon: 'property' },
      { name: '维修', icon: 'repair' },
    ],
  },
  {
    id: 'expense-entertainment',
    name: '娱乐',
    icon: 'entertainment',
    color: '#9EAD98',
    children: [
      { name: '电影演出', icon: 'movie' },
      { name: '游戏', icon: 'game' },
      { name: '会员订阅', icon: 'subscription' },
      { name: '旅游', icon: 'recreation' },
      { name: '其他', icon: 'entertainmentOther' },
    ],
  },
  {
    id: 'expense-health',
    name: '医疗健康',
    icon: 'health',
    color: '#8EAAA5',
    children: [
      { name: '门诊', icon: 'clinic' },
      { name: '药品', icon: 'medicine' },
      { name: '体检', icon: 'checkup' },
      { name: '保险', icon: 'insurance' },
    ],
  },
  {
    id: 'expense-education',
    name: '学习教育',
    icon: 'education',
    color: '#9B9BB6',
    children: [
      { name: '书籍', icon: 'book' },
      { name: '课程', icon: 'course' },
      { name: '考试', icon: 'exam' },
      { name: '文具', icon: 'stationery' },
    ],
  },
  {
    id: 'expense-gift',
    name: '人情礼物',
    icon: 'gift',
    color: '#D18B8B',
    children: [
      { name: '红包', icon: 'redpacket' },
      { name: '礼物', icon: 'present' },
      { name: '请客', icon: 'treat' },
      { name: '孝敬', icon: 'family' },
    ],
  },
  {
    id: 'expense-communication',
    name: '通讯网络',
    icon: 'communication',
    color: '#91A6B5',
    children: [
      { name: '话费', icon: 'phone' },
      { name: '宽带', icon: 'internet' },
      { name: '云服务', icon: 'cloud' },
    ],
  },
  {
    id: 'expense-pet',
    name: '宠物',
    icon: 'pet',
    color: '#C49A7A',
    children: [
      { name: '主粮零食', icon: 'petfood' },
      { name: '医疗', icon: 'petmedical' },
      { name: '用品', icon: 'petsupply' },
      { name: '服务', icon: 'petservice' },
    ],
  },
  {
    id: 'expense-sports',
    name: '运动',
    icon: 'sports',
    color: '#8DA18C',
    children: [
      { name: '场地', icon: 'venue' },
      { name: '装备', icon: 'equipment' },
      { name: '课程', icon: 'fitness' },
    ],
  },
  {
    id: 'expense-travel',
    name: '旅行',
    icon: 'travel',
    color: '#8FA8B1',
    children: [
      { name: '住宿', icon: 'hotel' },
      { name: '门票', icon: 'ticket' },
      { name: '交通', icon: 'tripTransport' },
      { name: '餐饮', icon: 'tripFood' },
    ],
  },
  {
    id: 'expense-other',
    name: '其他',
    icon: 'other',
    color: '#A39A91',
    children: [{ name: '其他', icon: 'other' }],
  },
];

const INCOME_GROUPS: Array<Pick<CategoryGroup, 'id' | 'name' | 'icon' | 'color'>> = [
  { id: 'income-salary', name: '工资', icon: 'salary', color: '#63795E' },
  { id: 'income-bonus', name: '奖金', icon: 'bonus', color: '#8B9E77' },
  { id: 'income-side', name: '兼职', icon: 'side', color: '#9EAD98' },
  { id: 'income-invest', name: '理财收益', icon: 'invest', color: '#D0A66E' },
  { id: 'income-redpacket', name: '红包', icon: 'gift', color: '#D18B8B' },
  { id: 'income-refund', name: '退款', icon: 'refund', color: '#8FA8B1' },
  { id: 'income-reimburse', name: '报销', icon: 'reimburse', color: '#91A6B5' },
  { id: 'income-other', name: '其他', icon: 'other', color: '#A39A91' },
];

function buildSeeds(): DefaultCategorySeed[] {
  const seeds: DefaultCategorySeed[] = [];

  EXPENSE_GROUPS.forEach((group, index) => {
    seeds.push({
      id: group.id,
      name: group.name,
      type: 'expense',
      parentId: null,
      icon: group.icon,
      color: group.color,
      sortOrder: index,
    });
    group.children.forEach(({ name, icon }, childIndex) => {
      seeds.push({
        id: `${group.id}-${childIndex + 1}`,
        name,
        type: 'expense',
        parentId: group.id,
        icon,
        color: group.color,
        sortOrder: childIndex,
      });
    });
  });

  INCOME_GROUPS.forEach((group, index) => {
    seeds.push({
      id: group.id,
      name: group.name,
      type: 'income',
      parentId: null,
      icon: group.icon,
      color: group.color,
      sortOrder: index,
    });
  });

  return seeds;
}

export const DEFAULT_CATEGORY_SEEDS = buildSeeds();
