import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = path.join(root, 'src/data/bacnet-quiz-questions.json');
const outputPath = path.join(root, 'docs/reviews/bacnet-competency-question-bank.md');
const bank = JSON.parse(await readFile(sourcePath, 'utf8'));
const questions = bank.questions;

const escapeCell = value => String(value).replaceAll('|', '\\|').replaceAll('\n', '<br>');
const answerLetter = index => String.fromCharCode(65 + index);
const categoryCounts = [...questions.reduce((counts, question) => {
  counts.set(question.category, (counts.get(question.category) ?? 0) + 1);
  return counts;
}, new Map())];

const lines = [
  '# BACnet competency question bank — manual review',
  '',
  '> **Status:** Draft. Review and approve this bank before publishing the quiz.',
  '',
  `This table is generated from \`src/data/bacnet-quiz-questions.json\` and contains **${questions.length} questions**. Run \`npm run quiz:review\` after editing the source bank.`,
  '',
  '## Coverage',
  '',
  '| Category | Questions |',
  '|---|---:|',
  ...categoryCounts.map(([category, count]) => `| ${escapeCell(category)} | ${count} |`),
  '',
  '## Review table',
  '',
  '| Review | ID | Category | Level | Question | Choices | Key | Rationale |',
  '|:---:|---|---|---|---|---|---|---|',
  ...questions.map(question => {
    const choices = question.options.map((option, index) => `${answerLetter(index)}. ${option}`).join('<br>');
    const key = `${answerLetter(question.correctIndex)}. ${question.options[question.correctIndex]}`;
    return `| ☐ | ${question.id} | ${escapeCell(question.category)} | ${question.difficulty} | ${escapeCell(question.prompt)} | ${escapeCell(choices)} | ${escapeCell(key)} | ${escapeCell(question.explanation)} |`;
  }),
  '',
  '## Technical references used for drafting',
  '',
  '- [ANSI/ASHRAE Standard 135 purpose and scope](https://www.ashrae.org/technical-resources/standards-and-guidelines/titles-purposes-and-scopes)',
  '- [ASHRAE Standard 135 resource files](https://data.ashrae.org/bacnet/)',
  '- [BACnet Committee technical site](https://bacnet.org/)',
  '- [BACnet International glossary](https://bacnetinternational.org/bacnet-glossary/)',
  '- [BACnet International BTL certification overview](https://bacnetinternational.org/btl-certification/)',
  '- [ANSI/ASHRAE Addendum bj introducing BACnet/SC](https://www.ashrae.org/file%20library/technical%20resources/standards%20and%20guidelines/standards%20addenda/135_2016_bj_20191118.pdf)',
  '- [NIST BACnet MS/TP implementation guidance hosted by the BACnet Committee](https://bacnet.org/wp-content/uploads/sites/4/2022/06/NISTIR-6392.pdf)'
];

const generated = `${lines.join('\n')}\n`;
if (process.argv.includes('--check')) {
  const existing = await readFile(outputPath, 'utf8').catch(() => '');
  if (existing !== generated) {
    console.error(`Quiz review table is stale. Run npm run quiz:review and commit ${path.relative(root, outputPath)}.`);
    process.exitCode = 1;
  } else {
    console.log(`Verified ${questions.length} questions in ${path.relative(root, outputPath)}`);
  }
} else {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, generated);
  console.log(`Wrote ${questions.length} questions to ${path.relative(root, outputPath)}`);
}
