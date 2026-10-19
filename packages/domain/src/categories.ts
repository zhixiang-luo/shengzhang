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
  children: string[];
}

const EXPENSE_GROUPS: CategoryGroup[] = [
  {
    id: 'expense-food',
    name: '餐饮',
    icon: 'food',
    color: '#E89A96',
    children: ['早餐', '午餐', '晚餐', '咖啡奶茶', '外卖', '水果零食', '聚餐'],
  },
  {
    id: 'expense-transport',
    name: '交通',
    icon: 'transport',
    color: '#D7A66F',
    children: ['公交地铁', '打车', '加油充电', '停车', '火车飞机', '单车'],
  },
  {
    id: 'expense-shopping',
    name: '购物',
    icon: 'shopping',
    color: '#C99187',
    children: ['服饰', '日用品', '数码', '美妆个护', '家居'],
  },
  {
    id: 'expense-home',
    name: '居住',
    icon: 'home',
    color: '#A78870',
    children: ['房租', '水电燃气', '物业', '维修'],
  },
  {
    id: 'expense-entertainment',
    name: '娱乐',
    icon: 'entertainment',
    color: '#9EAD98',
    children: ['电影演出', '游戏', '会员订阅', '旅游', '其他'],
  },
  {
    id: 'expense-health',
    name: '医疗健康',
    icon: 'health',
    color: '#8EAAA5',
    children: ['门诊', '药品', '体检', '保险'],
  },
  {
    id: 'expense-education',
    name: '学习教育',
    icon: 'education',
    color: '#9B9BB6',
    children: ['书籍', '课程', '考试', '文具'],
  },
  {
    id: 'expense-gift',
    name: '人情礼物',
    icon: 'gift',
    color: '#D18B8B',
    children: ['红包', '礼物', '请客', '孝敬'],
  },
  {
    id: 'expense-communication',
    name: '通讯网络',
    icon: 'communication',
    color: '#91A6B5',
    children: ['话费', '宽带', '云服务'],
  },
  {
    id: 'expense-pet',
    name: '宠物',
    icon: 'pet',
    color: '#C49A7A',
    children: ['主粮零食', '医疗', '用品', '服务'],
  },
  {
    id: 'expense-sports',
    name: '运动',
    icon: 'sports',
    color: '#8DA18C',
    children: ['场地', '装备', '课程'],
  },
  {
    id: 'expense-travel',
    name: '旅行',
    icon: 'travel',
    color: '#8FA8B1',
    children: ['住宿', '门票', '交通', '餐饮'],
  },
  {
    id: 'expense-other',
    name: '其他',
    icon: 'other',
    color: '#A39A91',
    children: ['其他'],
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
    group.children.forEach((name, childIndex) => {
      seeds.push({
        id: `${group.id}-${childIndex + 1}`,
        name,
        type: 'expense',
        parentId: group.id,
        icon: group.icon,
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
