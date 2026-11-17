import { describe, expect, it } from 'vitest';
import {
  bacnetQuizQuestions,
  createQuizSession,
  eliteQuizQuestions,
  emptyQuizProgress,
  parseQuizSession,
  recordQuizAnswer,
  selectQuizQuestionIds,
  standardQuizQuestions,
  type QuizProgress
} from './bacnet-quiz';

describe('BACnet competency question bank', () => {
  it('contains at least 100 structurally valid, uniquely identified questions', () => {
    expect(bacnetQuizQuestions.length).toBeGreaterThanOrEqual(100);
    expect(new Set(bacnetQuizQuestions.map(question => question.id)).size).toBe(bacnetQuizQuestions.length);
    for (const question of bacnetQuizQuestions) {
      expect(question.id).toMatch(/^BAC-[0-9]{3,}$/);
      expect(question.category.trim().length).toBeGreaterThanOrEqual(2);
      expect(['foundation', 'intermediate', 'advanced', 'elite']).toContain(question.difficulty);
      expect(question.prompt.length).toBeGreaterThan(12);
      expect(question.options).toHaveLength(4);
      expect(new Set(question.options).size).toBe(4);
      expect(question.options.every(option => option.trim().length > 0)).toBe(true);
      expect(question.correctIndex).toBeGreaterThanOrEqual(0);
      expect(question.correctIndex).toBeLessThan(4);
      expect(question.explanation.length).toBeGreaterThan(12);
      for (const reference of question.references ?? []) {
        expect(reference.title.trim().length).toBeGreaterThanOrEqual(3);
        expect(reference.url).toMatch(/^https:\/\//);
      }
      if (question.difficulty === 'elite') expect(question.references?.length).toBeGreaterThan(0);
    }
    const answerPositionCounts = [0, 1, 2, 3].map(index => bacnetQuizQuestions.filter(question => question.correctIndex === index).length);
    expect(Math.max(...answerPositionCounts) - Math.min(...answerPositionCounts)).toBeLessThanOrEqual(5);
  });

  it('does not make answer length a reliable shortcut', () => {
    const correctLengthRanks = [0, 1, 2, 3].map(shorterDistractorCount => bacnetQuizQuestions.filter(question => {
      const correctLength = question.options[question.correctIndex].length;
      return question.options.filter((option, index) => index !== question.correctIndex && option.length < correctLength).length === shorterDistractorCount;
    }).length);
    const correctIsLongest = bacnetQuizQuestions.filter(question => {
      const correctLength = question.options[question.correctIndex].length;
      const longestDistractor = Math.max(...question.options
        .filter((_, index) => index !== question.correctIndex)
        .map(option => option.length));
      return correctLength >= longestDistractor;
    });
    const conspicuousCorrectOutliers = bacnetQuizQuestions.filter(question => {
      const correctLength = question.options[question.correctIndex].length;
      const longestDistractor = Math.max(...question.options
        .filter((_, index) => index !== question.correctIndex)
        .map(option => option.length));
      return correctLength - longestDistractor >= 20;
    });

    expect(Math.min(...correctLengthRanks) / bacnetQuizQuestions.length).toBeGreaterThanOrEqual(0.15);
    expect(Math.max(...correctLengthRanks) / bacnetQuizQuestions.length).toBeLessThanOrEqual(0.4);
    expect(correctIsLongest.length / bacnetQuizQuestions.length).toBeLessThanOrEqual(0.25);
    expect(conspicuousCorrectOutliers).toEqual([]);
  });

  it('selects 35 questions that have not yet been answered correctly', () => {
    const progress = emptyQuizProgress();
    for (const question of bacnetQuizQuestions.slice(0, 40)) {
      progress.answers[question.id] = { attempts: 1, correctAnswers: 1, mastered: true, lastSelectedIndex: question.correctIndex };
    }
    const selected = selectQuizQuestionIds(bacnetQuizQuestions, progress, 35, () => 0.5);
    expect(selected).toHaveLength(35);
    expect(selected.every(id => !progress.answers[id]?.mastered)).toBe(true);
  });

  it('keeps standard and elite quiz draws in separate pools', () => {
    const progress = emptyQuizProgress();
    const standard = createQuizSession(progress, () => 0.5, 'standard');
    const elite = createQuizSession(progress, () => 0.5, 'elite');
    expect(standardQuizQuestions).toHaveLength(100);
    expect(eliteQuizQuestions).toHaveLength(60);
    expect(standard.questionIds.every(id => standardQuizQuestions.some(question => question.id === id))).toBe(true);
    expect(elite.questionIds.every(id => eliteQuizQuestions.some(question => question.id === id))).toBe(true);
  });

  it('uses mastered questions only after the remaining pool is exhausted', () => {
    const progress: QuizProgress = { version: 1, answers: {} };
    for (const question of bacnetQuizQuestions.slice(0, -10)) {
      progress.answers[question.id] = { attempts: 1, correctAnswers: 1, mastered: true, lastSelectedIndex: question.correctIndex };
    }
    const selected = selectQuizQuestionIds(bacnetQuizQuestions, progress, 35, () => 0.25);
    const unmasteredSelected = selected.filter(id => !progress.answers[id]?.mastered);
    expect(selected).toHaveLength(35);
    expect(unmasteredSelected).toHaveLength(10);
  });

  it('keeps a question mastered after a later incorrect answer', () => {
    const question = bacnetQuizQuestions[0];
    const mastered = recordQuizAnswer(emptyQuizProgress(), question, question.correctIndex);
    const answeredIncorrectly = recordQuizAnswer(mastered, question, (question.correctIndex + 1) % 4);
    expect(answeredIncorrectly.answers[question.id]).toMatchObject({ attempts: 2, correctAnswers: 1, mastered: true });
  });

  it('marks legacy fire-and-forget deliveries as unverified and retryable', () => {
    const question = bacnetQuizQuestions[0];
    const parsed = parseQuizSession(JSON.stringify({
      version: 1,
      sessionId: 'legacy-session',
      questionIds: [question.id],
      answers: { [question.id]: question.correctIndex },
      currentIndex: 0,
      startedAt: '2026-11-16T15:00:00.000Z',
      completedAt: '2026-11-16T15:01:00.000Z',
      deliveryStatus: 'sent',
      deliveryAttemptedAt: '2026-11-16T15:01:01.000Z'
    }));
    expect(parsed).toMatchObject({
      deliveryStatus: 'failed',
      deliveryMessage: expect.stringContaining('older build')
    });
  });
});
