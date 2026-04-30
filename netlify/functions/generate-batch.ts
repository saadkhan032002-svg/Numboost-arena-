import { generateQuestion, generateSmartDecoys } from '../../src/lib/mathEngine';

export const handler = async (event: any, context: any) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { categories, totalQuestions } = body;
    const questions: any[] = [];
    
    for (let i = 0; i < totalQuestions; i++) {
        const cat = categories[Math.floor(Math.random() * categories.length)];
        let q: any;
        let decoys: any;
        let attempts = 0;
        
        do {
            q = generateQuestion(cat.name, cat.difficulty, cat.customRange);
            attempts++;
        } while (attempts < 15 && questions.some((existing: any) => existing.question.expression === q.expression));
        
        decoys = generateSmartDecoys(q);
        
        // Shuffle options including answer
        const sortedOptions = [q.answer, ...decoys].sort(() => Math.random() - 0.5);
        const uniqueOptions = Array.from(new Set(sortedOptions));
        
        while (uniqueOptions.length < 4) {
          const offset = Math.floor(Math.random() * 20) + 1;
          const fallback = (typeof q.answer === 'number' ? q.answer : parseInt(q.answer || '0')) + offset;
          if (!uniqueOptions.includes(fallback) && !uniqueOptions.includes(String(fallback))) {
             uniqueOptions.push(fallback);
          }
        }
        
        q.options = uniqueOptions;
        questions.push({ question: q, options: uniqueOptions });
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ questions })
    };
  } catch (error: any) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
