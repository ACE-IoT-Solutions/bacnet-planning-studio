import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = path.join(root, 'src/data/bacnet-quiz-questions.json');
const outputPath = path.join(root, 'docs/reviews/bacnet-competency-question-bank.md');
const eliteOutputPath = path.join(root, 'docs/reviews/bacnet-elite-question-candidates.md');
const eliteNetworkOutputPath = path.join(root, 'docs/reviews/bacnet-elite-ip-ethernet-arc156-candidates.md');
const bank = JSON.parse(await readFile(sourcePath, 'utf8'));
const questions = bank.questions;

const escapeCell = value => String(value).replaceAll('|', '\\|').replaceAll('\n', '<br>');
const answerLetter = index => String.fromCharCode(65 + index);
const formatReferences = question => (question.references ?? [])
  .map(reference => `[${reference.title}](${reference.url})${reference.locator ? ` — ${reference.locator}` : ''}`)
  .join('<br>');
const renderRows = selectedQuestions => selectedQuestions.map(question => {
  const choices = question.options.map((option, index) => `${answerLetter(index)}. ${option}`).join('<br>');
  const key = `${answerLetter(question.correctIndex)}. ${question.options[question.correctIndex]}`;
  return `| ☐ | ${question.id} | ${escapeCell(question.category)} | ${question.difficulty} | ${escapeCell(question.prompt)} | ${escapeCell(choices)} | ${escapeCell(key)} | ${escapeCell(question.explanation)} | ${formatReferences(question)} |`;
});
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
  '| Review | ID | Category | Level | Question | Choices | Key | Rationale | Sources |',
  '|:---:|---|---|---|---|---|---|---|---|',
  ...renderRows(questions),
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
const eliteQuestions = questions.filter(question => question.difficulty === 'elite');
const eliteLines = [
  '# BACnet elite question candidates — manual review',
  '',
  '> **Status:** Draft candidates. Do not publish until each item is technically reviewed and approved.',
  '',
  `This focused table contains **${eliteQuestions.length} elite candidates** from \`src/data/bacnet-quiz-questions.json\`.`,
  '',
  '| Review | ID | Category | Level | Question | Choices | Key | Rationale | Sources |',
  '|:---:|---|---|---|---|---|---|---|---|',
  ...renderRows(eliteQuestions)
];
const eliteGenerated = `${eliteLines.join('\n')}\n`;
const eliteNetworkQuestions = eliteQuestions.filter(question => {
  const numericId = Number(question.id.replace('BAC-', ''));
  return numericId >= 131 && numericId <= 160;
});
const eliteNetworkLines = [
  '# BACnet elite IP, Ethernet, and ARC156 candidates — manual review',
  '',
  '> **Status:** Draft candidates. Do not publish until each item is technically reviewed and approved.',
  '',
  `This focused table contains the **${eliteNetworkQuestions.length} new elite candidates** covering ARC156, native BACnet/Ethernet, IP/UDP/BVLL, and Ethernet/802.1Q.`,
  '',
  '| Review | ID | Category | Level | Question | Choices | Key | Rationale | Sources |',
  '|:---:|---|---|---|---|---|---|---|---|',
  ...renderRows(eliteNetworkQuestions)
];
const eliteNetworkGenerated = `${eliteNetworkLines.join('\n')}\n`;
if (process.argv.includes('--check')) {
  const [existing, eliteExisting, eliteNetworkExisting] = await Promise.all([
    readFile(outputPath, 'utf8').catch(() => ''),
    readFile(eliteOutputPath, 'utf8').catch(() => ''),
    readFile(eliteNetworkOutputPath, 'utf8').catch(() => '')
  ]);
  if (existing !== generated || eliteExisting !== eliteGenerated || eliteNetworkExisting !== eliteNetworkGenerated) {
    console.error('Quiz review tables are stale. Run npm run quiz:review and commit all generated review files.');
    process.exitCode = 1;
  } else {
    console.log(`Verified ${questions.length} questions, including ${eliteQuestions.length} elite candidates.`);
  }
} else {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await Promise.all([
    writeFile(outputPath, generated),
    writeFile(eliteOutputPath, eliteGenerated),
    writeFile(eliteNetworkOutputPath, eliteNetworkGenerated)
  ]);
  console.log(`Wrote ${questions.length} questions, ${eliteQuestions.length} elite candidates, and ${eliteNetworkQuestions.length} focused network candidates to the review tables.`);
}
