import { Employee, License } from '../types';

export const CATEGORY_ORDER: { [key: string]: number } = {
  'ضابط': 1,
  'ضابط صف': 2,
  'مهني': 3,
  'مدني': 4,
};

export const OFFICER_RANK_ORDER: { [key: string]: number } = {
  'مقدم': 1,
  'رائد': 2,
  'نقيب': 3,
  'ملازم أول': 4,
  'ملازم': 5,
};

export const NCO_RANK_ORDER: { [key: string]: number } = {
  'و.أ.ضابط': 1,
  'و.ضابط': 2,
  'رقيب أول': 3,
  'رقيب': 4,
  'عريف': 5,
  'و.عريف': 6,
};

export const sortEmployees = (employees: Employee[]): Employee[] => {
  return [...employees].sort((a, b) => {
    const categoryA = CATEGORY_ORDER[a.category] || 99;
    const categoryB = CATEGORY_ORDER[b.category] || 99;

    if (categoryA !== categoryB) {
      return categoryA - categoryB;
    }

    if (a.category === 'ضابط') {
      const rankA = OFFICER_RANK_ORDER[a.rank.replace(' حقوقي', '').trim()] || 99;
      const rankB = OFFICER_RANK_ORDER[b.rank.replace(' حقوقي', '').trim()] || 99;
      if (rankA !== rankB) return rankA - rankB;
    }

    if (a.category === 'ضابط صف') {
      const rankA = NCO_RANK_ORDER[a.rank] || 99;
      const rankB = NCO_RANK_ORDER[b.rank] || 99;
      if (rankA !== rankB) return rankA - rankB;
    }

    return a.full_name.localeCompare(b.full_name);
  });
};

export const sortLicenses = (licenses: License[]): License[] => {
  return [...licenses].sort((a, b) => {
    if (!a.employee || !b.employee) return 0;

    const categoryA = CATEGORY_ORDER[a.employee.category] || 99;
    const categoryB = CATEGORY_ORDER[b.employee.category] || 99;

    if (categoryA !== categoryB) {
      return categoryA - categoryB;
    }

    if (a.employee.category === 'ضابط') {
      const rankA = OFFICER_RANK_ORDER[a.employee.rank.replace(' حقوقي', '').trim()] || 99;
      const rankB = OFFICER_RANK_ORDER[b.employee.rank.replace(' حقوقي', '').trim()] || 99;
      if (rankA !== rankB) return rankA - rankB;
    }

    if (a.employee.category === 'ضابط صف') {
      const rankA = NCO_RANK_ORDER[a.employee.rank] || 99;
      const rankB = NCO_RANK_ORDER[b.employee.rank] || 99;
      if (rankA !== rankB) return rankA - rankB;
    }

    return new Date(b.license_date).getTime() - new Date(a.license_date).getTime();
  });
};
