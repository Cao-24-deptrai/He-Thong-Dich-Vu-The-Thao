#!/usr/bin/env node
// In ra đúng một phần của docs/SPEC.md để agent không phải đọc cả file.
// Dùng:
//   node spec-section.mjs --list                 # liệt kê mọi tiêu đề (mục lục)
//   node spec-section.mjs M04                    # in phần có tiêu đề bắt đầu bằng "M04"
//   node spec-section.mjs "3.6"                  # in mục 3.6
//   node spec-section.mjs A02                    # không có tiêu đề: in các dòng chứa "A02" (giả định)
//   node spec-section.mjs M04 --file path/to/SPEC.md
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const fileIdx = args.indexOf('--file');
const file = fileIdx >= 0 ? args[fileIdx + 1] : path.resolve(process.cwd(), 'docs/SPEC.md');
if (fileIdx >= 0) args.splice(fileIdx, 2);

if (!fs.existsSync(file)) {
  console.error(`Không tìm thấy ${file}. Chạy từ gốc kho hoặc dùng --file.`);
  process.exit(1);
}
const lines = fs.readFileSync(file, 'utf8').split('\n');

// bỏ qua tiêu đề nằm trong khối code
const headings = [];
let inFence = false;
lines.forEach((l, i) => {
  if (/^```/.test(l)) inFence = !inFence;
  if (inFence) return;
  const m = /^(#{1,6})\s+(.*)$/.exec(l);
  if (m) headings.push({ i, level: m[1].length, text: m[2].trim() });
});

if (args.includes('--list') || args.length === 0) {
  for (const h of headings) console.log(`${'  '.repeat(h.level - 1)}${h.text}`);
  process.exit(0);
}

const q = args[0].toLowerCase();
const norm = (s) => s.toLowerCase();
let hit = headings.find((h) => norm(h.text).startsWith(q));
if (!hit) hit = headings.find((h) => norm(h.text).includes(q));

if (hit) {
  const next = headings.find((h) => h.i > hit.i && h.level <= hit.level);
  const end = next ? next.i : lines.length;
  console.log(lines.slice(hit.i, end).join('\n').trimEnd());
} else {
  const found = lines.filter((l) => norm(l).includes(q));
  if (!found.length) { console.error(`Không tìm thấy "${args[0]}". Dùng --list để xem mục lục.`); process.exit(2); }
  console.log(found.join('\n'));
}
