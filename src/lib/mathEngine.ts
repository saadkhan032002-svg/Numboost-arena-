
export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

export interface Question {
  id: string;
  expression: string;
  answer: number | string;
  options?: (number | string)[];
  type: string;
  category: string;
  points?: number;
}

const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);

const getFloat = (min: number, max: number, dp: number): number => {
  let val: number;
  do {
    val = parseFloat((Math.random() * (max - min) + min).toFixed(dp));
  } while (Number.isInteger(val)); // Force true decimals
  return val;
};

const getInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

export const generateQuestion = (
  category: string, // Can be "Fractions-Addition", "Decimals-Mix", etc.
  difficulty?: Difficulty,
  customRange?: { start: number | ''; end: number | '' }
): Question => {
  const id = Math.random().toString(36).substring(7);
  let expression = '';
  let answer: number | string = 0;

  const getRangeMap = (diff: Difficulty = 'Beginner'): [number, number] => {
    const map: Record<Difficulty, [number, number]> = {
      Beginner: [2, 10],
      Intermediate: [10, 50],
      Advanced: [50, 200],
      Expert: [100, 1000],
    };
    return map[diff];
  };

  const [min, max] = getRangeMap(difficulty || 'Beginner');

  let targetCategory = category;

  if (targetCategory === 'Random') {
    const all = ['Addition', 'Subtraction', 'Multiplication', 'Division', 'Decimals-Mix', 'Fractions-Mix', 'Tables', 'Squares', 'Cubes', 'Roots'];
    targetCategory = all[getInt(0, all.length - 1)];
  }

  // Parse category for Decimals and Fractions subcategories
  let mainCat = targetCategory;
  let subOp = 'Addition';
  if (targetCategory.startsWith('Decimals-') || targetCategory.startsWith('Fractions-')) {
    [mainCat, subOp] = targetCategory.split('-');
  }

  // Handle main level Mix
  if (mainCat === 'Mix') {
    const ops = ['Addition', 'Subtraction', 'Multiplication', 'Division'];
    mainCat = ops[getInt(0, 3)];
  }

  // Handle sub-level Mix (e.g. Fractions-Mix)
  if (subOp === 'Mix') {
    const ops = ['Addition', 'Subtraction', 'Multiplication', 'Division'];
    subOp = ops[getInt(0, 3)];
  }

  switch (mainCat) {
    case 'Addition': {
      const a = getInt(min, max);
      const b = getInt(min, max);
      expression = `${a} + ${b}`;
      answer = a + b;
      break;
    }
    case 'Subtraction': {
      const a = getInt(min, max);
      const b = getInt(min, a); // Ensure non-negative
      expression = `${a} - ${b}`;
      answer = a - b;
      break;
    }
    case 'Multiplication': {
      const mulDiffMap: Record<Difficulty, [number, number]> = {
        Beginner: [2, 12],
        Intermediate: [10, 30],
        Advanced: [20, 100],
        Expert: [50, 200],
      };
      const r = mulDiffMap[difficulty || 'Beginner'];
      const a = getInt(r[0], r[1]);
      const b = getInt(difficulty === 'Beginner' ? 2 : r[0], difficulty === 'Expert' ? 100 : 20);
      expression = `${a} × ${b}`;
      answer = a * b;
      break;
    }
    case 'Division': {
      const b = getInt(2, difficulty === 'Beginner' ? 12 : (difficulty === 'Expert' ? 100 : 30));
      const mult = getInt(min, max);
      const a = b * mult;
      expression = `${a} ÷ ${b}`;
      answer = mult;
      break;
    }
    case 'Tables': {
      const start = typeof customRange?.start === 'number' ? customRange.start : 2;
      let limit = 20;
      if (!customRange) {
        if (difficulty === 'Beginner') limit = 10;
        else if (difficulty === 'Intermediate') limit = 20;
        else if (difficulty === 'Advanced') limit = 30;
        else if (difficulty === 'Expert') limit = 50;
      }
      const end = typeof customRange?.end === 'number' ? Math.max(start, customRange.end) : Math.max(start, limit);
      const table = getInt(start, end);
      const multiplier = getInt(1, difficulty === 'Expert' ? 20 : 12);
      expression = `${table} × ${multiplier}`;
      answer = table * multiplier;
      break;
    }
    case 'Squares': {
      const start = typeof customRange?.start === 'number' ? customRange.start : 1;
      let limit = 20;
      if (!customRange) {
        if (difficulty === 'Beginner') limit = 10;
        else if (difficulty === 'Intermediate') limit = 20;
        else if (difficulty === 'Advanced') limit = 30;
        else if (difficulty === 'Expert') limit = 40;
      }
      const end = typeof customRange?.end === 'number' ? Math.max(start, customRange.end) : Math.max(start, limit);
      const val = getInt(start, end);
      expression = `${val}²`;
      answer = val * val;
      break;
    }
    case 'Cubes': {
      const start = typeof customRange?.start === 'number' ? customRange.start : 1;
      let limit = 10;
      if (!customRange) {
        if (difficulty === 'Beginner') limit = 5;
        else if (difficulty === 'Intermediate') limit = 10;
        else if (difficulty === 'Advanced') limit = 15;
        else if (difficulty === 'Expert') limit = 20;
      }
      const end = typeof customRange?.end === 'number' ? Math.max(start, customRange.end) : Math.max(start, limit);
      const val = getInt(start, end);
      expression = `${val}³`;
      answer = val * val * val;
      break;
    }
    case 'Roots': {
      const start = typeof customRange?.start === 'number' ? customRange.start : 1;
      let limit = 20;
      if (!customRange) {
        if (difficulty === 'Beginner') limit = 6;
        else if (difficulty === 'Intermediate') limit = 12;
        else if (difficulty === 'Advanced') limit = 18;
        else if (difficulty === 'Expert') limit = 24;
      }
      const end = typeof customRange?.end === 'number' ? Math.max(start, customRange.end) : Math.max(start, limit);
      const val = getInt(start, end);
      // For beginner, it generates e.g. √4, √9, roots from 1 to 6.
      expression = `√${val * val}`;
      answer = val;
      break;
    }
    case 'Decimals': {
      let dp = 1;
      let wholeMax = 10;
      if (difficulty === 'Intermediate') { dp = 1; wholeMax = 50; }
      if (difficulty === 'Advanced') { dp = 2; wholeMax = 100; }
      if (difficulty === 'Expert') { dp = 3; wholeMax = 500; }

      const a = getFloat(1, wholeMax, dp);
      const b = getFloat(1, wholeMax, dp);

      if (subOp === 'Addition') {
        expression = `${a} + ${b}`;
        answer = parseFloat((a + b).toFixed(dp));
      } else if (subOp === 'Subtraction') {
        const big = Math.max(a, b);
        const small = Math.min(a, b);
        expression = `${big} - ${small}`;
        answer = parseFloat((big - small).toFixed(dp));
      } else if (subOp === 'Multiplication') {
        const ma = getFloat(2, difficulty === 'Advanced' || difficulty === 'Expert' ? 20 : 10, dp === 1 ? 1 : 2);
        const mb = getFloat(2, difficulty === 'Expert' ? 10 : 5, 1);
        expression = `${ma} × ${mb}`;
        const totalDp = dp === 1 ? 2 : 3;
        answer = parseFloat((ma * mb).toFixed(totalDp));
      } else if (subOp === 'Division') {
         const db = getFloat(1, 10, 1);
         const mult = getInt(2, difficulty === 'Advanced' || difficulty === 'Expert' ? 50 : 10);
         const da = parseFloat((db * mult).toFixed(1));
         expression = `${da} ÷ ${db}`;
         answer = mult;
      }
      break;
    }
    case 'Fractions': {
      let dMax = 5;
      if (difficulty === 'Intermediate') dMax = 10;
      if (difficulty === 'Advanced') dMax = 20;
      if (difficulty === 'Expert') dMax = 50;

      let d1 = getInt(3, dMax);
      let n1 = getInt(1, d1 - 1);
      if (difficulty === 'Expert') n1 = getInt(1, d1 * 2); // improper fractions ok

      let d2 = getInt(3, dMax);
      let n2 = getInt(1, d2 - 1);
      if (difficulty === 'Expert') n2 = getInt(1, d2 * 2);

      if (subOp === 'Addition' || subOp === 'Subtraction') {
        if (difficulty === 'Beginner') d2 = d1; // Same denominator for beginners
        
        const num1 = n1 * d2;
        const num2 = n2 * d1;

        if (subOp === 'Subtraction' && num1 < num2) {
           [n1, d1, n2, d2] = [n2, d2, n1, d1];
        }

        const commonD = d1 * d2;
        const finalNum = subOp === 'Addition' ? (n1 * d2) + (n2 * d1) : Math.abs((n1 * d2) - (n2 * d1));
        
        expression = `${n1}/${d1} ${subOp === 'Addition' ? '+' : '-'} ${n2}/${d2}`;
        
        const divis = gcd(finalNum, commonD);
        if (finalNum === 0) answer = "0";
        else if (finalNum/divis === commonD/divis) answer = "1";
        else answer = `${finalNum/divis}/${commonD/divis}`;

      } else if (subOp === 'Multiplication') {
        expression = `${n1}/${d1} × ${n2}/${d2}`;
        const finalNum = n1 * n2;
        const finalD = d1 * d2;
        const divis = gcd(finalNum, finalD);
        if (finalNum/divis === finalD/divis) answer = "1";
        else answer = `${finalNum/divis}/${finalD/divis}`;
      } else if (subOp === 'Division') {
        expression = `${n1}/${d1} ÷ ${n2}/${d2}`;
        const finalNum = n1 * d2;
        const finalD = d1 * n2;
        const divis = gcd(finalNum, finalD);
         if (finalNum/divis === finalD/divis) answer = "1";
         else if (finalD/divis === 1) answer = String(finalNum/divis);
        else answer = `${finalNum/divis}/${finalD/divis}`;
      }
      break;
    }
    default:
      expression = '1 + 1';
      answer = 2;
  }

  let points = 0;
  if (category.toLowerCase().includes('table') || category.toLowerCase().includes('root') || category.toLowerCase().includes('square') || category.toLowerCase().includes('cube')) {
    points = 2;
  } else {
    points = { Beginner: 1, Intermediate: 2, Advanced: 3, Expert: 4 }[difficulty || 'Beginner'] || 1;
  }

  return { id, expression, answer, type: category, category, points };
};

export const generateSmartDecoys = (q: Question): (number | string)[] => {
  const decoys = new Set<string | number>();
  
  if (typeof q.answer === 'string' && q.answer.includes('/')) {
    // Fraction decoys
    const [n, d] = q.answer.split('/').map(Number);
    while (decoys.size < 3) {
      const offsetN = Math.floor(Math.random() * 3) - 1;
      const offsetD = Math.floor(Math.random() * 3) - 1;
      const newN = Math.max(1, n + offsetN);
      const newD = Math.max(2, d + offsetD);
      const dec = `${newN}/${newD}`;
      if (dec !== q.answer) decoys.add(dec);
    }
  } else if (typeof q.answer === 'number' && !Number.isInteger(q.answer)) {
    // Decimal decoys
    while (decoys.size < 3) {
      const offset = (Math.random() * 2 - 1).toFixed(1);
      const dec = parseFloat((q.answer + parseFloat(offset)).toFixed(1));
      if (dec !== q.answer) decoys.add(dec);
    }
  } else {
    // Integer decoys
    while (decoys.size < 3) {
      const offset = Math.floor(Math.random() * 10) - 5;
      if (offset === 0) continue;
      const dec = (typeof q.answer === 'number' ? q.answer : parseInt(q.answer)) + offset;
      if (dec !== q.answer && dec > 0) decoys.add(dec);
    }
  }
  return Array.from(decoys);
};

export const shuffleArray = <T>(array: T[]): T[] => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};
