const express = require("express");
const Database = require("better-sqlite3");

const app = express();
const db = new Database("internships.db");

app.use(express.json());

db.exec(`
  CREATE TABLE IF NOT EXISTS internships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT NOT NULL,
    mode TEXT NOT NULL,
    openings INTEGER NOT NULL DEFAULT 1,
    skills TEXT NOT NULL DEFAULT '[]'
  )
`);

const count = db.prepare("SELECT COUNT(*) AS total FROM internships").get().total;

if (count === 0) {
  const insert = db.prepare(`
    INSERT INTO internships (title, company, location, mode, openings, skills)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const seed = [
    ["Frontend Intern", "Tech Solutions", "India", "Remote", 3, '["HTML","CSS","JavaScript"]'],
    ["API Engineering Intern", "Code Labs", "Pune", "Hybrid", 2, '["Node.js","SQL","Testing"]'],
    ["UI/UX Intern", "Design Studio", "India", "Remote", 1, '["Figma","Research"]']
  ];

  const insertMany = db.transaction((rows) => {
    for (const row of rows) insert.run(...row);
  });
  insertMany(seed);
}

function formatInternship(row) {
  return { ...row, skills: JSON.parse(row.skills) };
}

function validate(data, partial = false) {
  const fields = ["title", "company", "location", "mode", "openings", "skills"];

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return "Request body must be a JSON object";
  }

  if (partial && Object.keys(data).length === 0) {
    return "Provide at least one field to update";
  }

  for (const key of Object.keys(data)) {
    if (!fields.includes(key)) return `Unknown field: ${key}`;
  }

  for (const key of fields) {
    if (partial && !(key in data)) continue;

    const value = data[key];

    if (["title", "company", "location"].includes(key)) {
      if (typeof value !== "string" || !value.trim()) {
        return `${key} must be a non-empty string`;
      }
    }

    if (key === "mode" && !["Remote", "Hybrid", "On-site"].includes(value)) {
      return "mode must be Remote, Hybrid, or On-site";
    }

    if (key === "openings" &&
        (!Number.isInteger(value) || value < 1)) {
      return "openings must be a positive integer";
    }

    if (key === "skills" &&
        (!Array.isArray(value) ||
         !value.every(skill => typeof skill === "string" && skill.trim()))) {
      return "skills must be an array of non-empty strings";
    }
  }

  return null;
}

app.get("/api/internships", (req, res) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 10);

  if (!Number.isInteger(page) || page < 1 ||
      !Number.isInteger(limit) || limit < 1 || limit > 100) {
    return res.status(400).json({
      error: "page must be positive and limit must be between 1 and 100"
    });
  }

  const total = db.prepare("SELECT COUNT(*) AS total FROM internships").get().total;
  const rows = db.prepare(
    "SELECT * FROM internships ORDER BY id LIMIT ? OFFSET ?"
  ).all(limit, (page - 1) * limit);

  res.json({
    data: rows.map(formatInternship),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  });
});

app.get("/api/internships/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "Invalid internship ID" });
  }

  const row = db.prepare("SELECT * FROM internships WHERE id = ?").get(id);
  if (!row) return res.status(404).json({ error: "Internship not found" });

  res.json({ data: formatInternship(row) });
});

app.post("/api/internships", (req, res) => {
  const error = validate(req.body);
  if (error) return res.status(400).json({ error });

  const data = req.body;
  const result = db.prepare(`
    INSERT INTO internships (title, company, location, mode, openings, skills)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    data.title.trim(), data.company.trim(), data.location.trim(),
    data.mode, data.openings ?? 1, JSON.stringify(data.skills ?? [])
  );

  const row = db.prepare("SELECT * FROM internships WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json({ data: formatInternship(row) });
});

app.put("/api/internships/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "Invalid internship ID" });
  }

  const existing = db.prepare("SELECT * FROM internships WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ error: "Internship not found" });

  const data = req.body;
  const error = validate(data);
  if (error) return res.status(400).json({ error });

  db.prepare(`
    UPDATE internships
    SET title = ?, company = ?, location = ?, mode = ?, openings = ?, skills = ?
    WHERE id = ?
  `).run(
    data.title.trim(), data.company.trim(), data.location.trim(),
    data.mode, data.openings ?? 1, JSON.stringify(data.skills ?? []), id
  );

  const row = db.prepare("SELECT * FROM internships WHERE id = ?").get(id);
  res.json({ data: formatInternship(row) });
});

app.patch("/api/internships/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "Invalid internship ID" });
  }

  const existing = db.prepare("SELECT * FROM internships WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ error: "Internship not found" });

  const error = validate(req.body, true);
  if (error) return res.status(400).json({ error });

  const current = formatInternship(existing);
  const updated = { ...current, ...req.body };

  const fullError = validate(updated);
  if (fullError) return res.status(400).json({ error: fullError });

  db.prepare(`
    UPDATE internships
    SET title = ?, company = ?, location = ?, mode = ?, openings = ?, skills = ?
    WHERE id = ?
  `).run(
    updated.title.trim(), updated.company.trim(), updated.location.trim(),
    updated.mode, updated.openings, JSON.stringify(updated.skills), id
  );

  const row = db.prepare("SELECT * FROM internships WHERE id = ?").get(id);
  res.json({ data: formatInternship(row) });
});

app.delete("/api/internships/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "Invalid internship ID" });
  }

  const result = db.prepare("DELETE FROM internships WHERE id = ?").run(id);
  if (!result.changes) {
    return res.status(404).json({ error: "Internship not found" });
  }

  res.status(204).end();
});

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Internship API running at http://localhost:${PORT}`);
});