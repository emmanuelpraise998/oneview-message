const express = require("express");
const helmet = require("helmet");
const multer = require("multer");
const Database = require("better-sqlite3");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || "";
const DATA_DIR = path.join(__dirname, "data");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, "oneview.sqlite"));
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    token TEXT PRIMARY KEY,
    body TEXT NOT NULL,
    image_name TEXT,
    created_at INTEGER NOT NULL,
    viewed_at INTEGER
  )
`);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"]
    }
  }
}));
app.use(express.json({ limit: "20kb" }));
app.use(express.static(path.join(__dirname, "public"), { index: "index.html" }));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, _file, cb) => cb(null, crypto.randomBytes(16).toString("hex"))
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    cb(allowed.includes(file.mimetype) ? null : new Error("Use a JPG, PNG, WEBP, or GIF image."), allowed.includes(file.mimetype));
  }
});

app.post("/api/messages", upload.single("image"), (req, res) => {
  const body = (req.body.message || "").trim();
  let imageName = req.file ? path.basename(req.file.filename) : null;
  if (!req.file && req.body.usePresetImage === "true") {
    const presetPath = path.join(__dirname, "public", "assets", "adun-mi-photo.jpeg");
    imageName = crypto.randomBytes(16).toString("hex");
    fs.copyFileSync(presetPath, path.join(UPLOAD_DIR, imageName));
  }
  if (!body && !imageName) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: "Add a message or a picture first." });
  }
  if (body.length > 5000) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: "Message must be 5,000 characters or fewer." });
  }
  const token = crypto.randomBytes(24).toString("base64url");
  db.prepare("INSERT INTO messages (token, body, image_name, created_at) VALUES (?, ?, ?, ?)")
    .run(token, body, imageName, Date.now());
  const origin = BASE_URL || `${req.protocol}://${req.get("host")}`;
  res.json({ link: `${origin}/m/${token}` });
});

// A single SQLite transaction claims the message. Concurrent requests: only one can win.
app.get("/api/messages/:token", (req, res) => {
  const token = req.params.token;
  if (!/^[A-Za-z0-9_-]{32}$/.test(token)) return res.status(404).json({ error: "This message is unavailable." });

  const claim = db.transaction(() => {
    const row = db.prepare("SELECT * FROM messages WHERE token = ? AND viewed_at IS NULL").get(token);
    if (!row) return null;
    const result = db.prepare("UPDATE messages SET viewed_at = ? WHERE token = ? AND viewed_at IS NULL")
      .run(Date.now(), token);
    if (result.changes !== 1) return null;
    return row;
  });
  const row = claim();
  if (!row) return res.status(410).json({ error: "This message has already been viewed or is unavailable." });

  let imageData = null;
  if (row.image_name) {
    const imagePath = path.join(UPLOAD_DIR, row.image_name);
    try {
      const ext = path.extname(imagePath).toLowerCase();
      const mime = ({ ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif" })[ext] || "application/octet-stream";
      // Upload filenames are random without extensions; derive MIME from stored original metadata is better.
      // Use signature sniffing for common image formats.
      const buffer = fs.readFileSync(imagePath);
      let detected = "image/jpeg";
      if (buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) detected = "image/png";
      else if (buffer.subarray(0, 3).equals(Buffer.from([255,216,255]))) detected = "image/jpeg";
      else if (buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") detected = "image/webp";
      else if (buffer.toString("ascii", 0, 3) === "GIF") detected = "image/gif";
      imageData = `data:${detected};base64,${buffer.toString("base64")}`;
      fs.unlinkSync(imagePath);
    } catch (_e) {
      imageData = null;
    }
  }
  // Remove the consumed database row after producing the response.
  db.prepare("DELETE FROM messages WHERE token = ?").run(token);
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.set("Pragma", "no-cache");
  res.json({ message: row.body, image: imageData });
});

app.get("/m/:token", (_req, res) => res.sendFile(path.join(__dirname, "public", "view.html")));

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "Image must be 5 MB or smaller." });
  }
  res.status(400).json({ error: err.message || "Something went wrong." });
});

app.use(express.static(__dirname));
app.listen(PORT, () => console.log(`ONEVIEW running at http://localhost:${PORT}`));
