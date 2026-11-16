import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const quizHtmlUrl = new URL('../../public/quiz.html', import.meta.url);
const quizImageUrl = new URL('../../public/brand/bacnet-quiz-social.png', import.meta.url);

describe('quiz social metadata', () => {
  it('publishes a crawlable quiz URL with dedicated Open Graph metadata', () => {
    const html = readFileSync(quizHtmlUrl, 'utf8');
    expect(html).toContain('property="og:title" content="BACnet Competency Quiz | BACnet Studio"');
    expect(html).toContain('property="og:url" content="https://ace-iot-solutions.github.io/bacnet-planning-studio/quiz.html"');
    expect(html).toContain('property="og:image" content="https://ace-iot-solutions.github.io/bacnet-planning-studio/brand/bacnet-quiz-social.png"');
    expect(html).toContain("new URL('./#quiz', window.location.href)");
  });

  it('uses a 1200 by 627 PNG for the quiz link preview', () => {
    const png = readFileSync(quizImageUrl);
    expect(png.subarray(1, 4).toString('ascii')).toBe('PNG');
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(627);
  });
});
