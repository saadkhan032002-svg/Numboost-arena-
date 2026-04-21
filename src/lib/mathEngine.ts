
export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

export interface Question {
  id: string;
  expression: string;
  answer: number | string;
  options?: (number | string)[];
  type: string;
  category: string;
}

export const generateQuestion = (
  category: string,
  difficulty?: Difficulty,
  customRange?: { start: number; end: number }
): Question => {
  const id = Math.random().toString(36).substring(7);
  let expression = '';
  let answer: number | string = 0;

  const getRangeMap = (diff: Difficulty = 'Beginner'): [number, number] => {
    const map: Record<Difficulty, [number, number]> = {
      Beginner: [1, 10],
      Intermediate: [10, 50],
      Advanced: [50, 200],
      Expert: [100, 1000],
    };
    return map[diff];
  };

  const [min, max] = getRangeMap(difficulty || 'Beginner');

  switch (category) {
    case 'Addition': {
      const a = Math.floor(Math.random() * (max - min + 1)) + min;
      const b = Math.floor(Math.random() * (max - min + 1)) + min;
      expression = `${a} + ${b}`;
      answer = a + b;
      break;
    }
    case 'Subtraction': {
      const a = Math.floor(Math.random() * (max - min + 1)) + min;
      const b = Math.floor(Math.random() * a);
      expression = `${a} - ${b}`;
      answer = a - b;
      break;
    }
    case 'Multiplication': {
      const a = difficulty === 'Expert' ? Math.floor(Math.random() * 50) + 10 : Math.floor(Math.random() * 20) + 2;
      const b = difficulty === 'Expert' ? Math.floor(Math.random() * 20) + 2 : Math.floor(Math.random() * 10) + 2;
      expression = `${a} × ${b}`;
      answer = a * b;
      break;
    }
    case 'Division': {
      const b = Math.floor(Math.random() * 10) + 2;
      const a = b * (Math.floor(Math.random() * 10) + 2);
      expression = `${a} ÷ ${b}`;
      answer = a / b;
      break;
    }
    case 'Tables': {
      const start = customRange?.start || 2;
      const end = Math.max(start, customRange?.end || 12);
      const table = Math.floor(Math.random() * (end - start + 1)) + start;
      const multiplier = Math.floor(Math.random() * 10) + 1;
      expression = `${table} × ${multiplier}`;
      answer = table * multiplier;
      break;
    }
    case 'Squares': {
      const start = customRange?.start || 1;
      const end = Math.max(start, customRange?.end || 20);
      const val = Math.floor(Math.random() * (end - start + 1)) + start;
      expression = `${val}²`;
      answer = val * val;
      break;
    }
    case 'Cubes': {
      const start = customRange?.start || 1;
      const end = Math.max(start, customRange?.end || 10);
      const val = Math.floor(Math.random() * (end - start + 1)) + start;
      expression = `${val}³`;
      answer = val * val * val;
      break;
    }
    case 'Roots': {
      const start = customRange?.start || 1;
      const end = Math.max(start, customRange?.end || 20);
      const val = Math.floor(Math.random() * (end - start + 1)) + start;
      expression = `√${val * val}`;
      answer = val;
      break;
    }
    case 'Decimals': {
      const a = (Math.random() * max).toFixed(1);
      const b = (Math.random() * max).toFixed(1);
      expression = `${a} + ${b}`;
      answer = parseFloat((parseFloat(a) + parseFloat(b)).toFixed(1));
      break;
    }
    case 'Fractions': {
      const d1 = Math.floor(Math.random() * 8) + 2;
      const n1 = Math.floor(Math.random() * (d1 - 1)) + 1;
      const d2 = d1;
      const n2 = Math.floor(Math.random() * (d2 - 1)) + 1;
      expression = `${n1}/${d1} + ${n2}/${d2}`;
      const resN = n1 + n2;
      const resD = d1;
      answer = `${resN}/${resD}`;
      break;
    }
    default:
      expression = '1 + 1';
      answer = 2;
  }

  return { id, expression, answer, type: category, category };
};

export const shuffleArray = <T>(array: T[]): T[] => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};
