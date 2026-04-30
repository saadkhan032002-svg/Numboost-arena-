import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { generateQuestion, generateSmartDecoys } from "./src/lib/mathEngine";
import cors from "cors";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API endpoints
  app.post("/api/generate-batch", (req, res) => {
    try {
      const { categories, totalQuestions } = req.body;
      const questions = [];
      
      for (let i = 0; i < totalQuestions; i++) {
        const cat = categories[Math.floor(Math.random() * categories.length)];
        let q: any;
        let decoys: any;
        let attempts = 0;
        
        do {
            q = generateQuestion(cat.name, cat.difficulty, cat.customRange);
            attempts++;
        } while (attempts < 15 && questions.some(existing => existing.question.expression === q.expression));
        
        decoys = generateSmartDecoys(q);
        
        // Shuffle options including answer
        const sortedOptions = [q.answer, ...decoys].sort(() => Math.random() - 0.5);
        const uniqueOptions = Array.from(new Set(sortedOptions));
        
        // Ensure strictly 4 unique options
        while (uniqueOptions.length < 4) {
          const offset = Math.floor(Math.random() * 20) + 1; // +1 to prevent adding exactly q.answer (0 offset)
          const fallback = (typeof q.answer === 'number' ? q.answer : parseInt(q.answer || '0')) + offset;
          if (!uniqueOptions.includes(fallback) && !uniqueOptions.includes(String(fallback))) {
             uniqueOptions.push(fallback);
          }
        }
        
        q.options = uniqueOptions;
        questions.push({ question: q, options: uniqueOptions });
      }

      res.json({ questions });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // In express 5, use *all or *
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
