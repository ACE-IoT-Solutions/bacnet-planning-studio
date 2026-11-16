// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { bacnetQuizQuestions, createQuizSession, emptyQuizProgress, type QuizParticipant } from './bacnet-quiz';
import { buildQuizResultPayload, isValidQuizEmail, submitQuizResult } from './quiz-results';

describe('quiz result delivery', () => {
  it('accepts valid-looking email addresses and rejects malformed values', () => {
    expect(isValidQuizEmail(' Learner@Example.com ')).toBe(true);
    expect(isValidQuizEmail('not-an-email')).toBe(false);
    expect(isValidQuizEmail('missing-domain@')).toBe(false);
  });

  it('builds a result payload from the completed session', () => {
    const session = createQuizSession(emptyQuizProgress(), () => 0.5);
    for (const id of session.questionIds) session.answers[id] = bacnetQuizQuestions.find(question => question.id === id)!.correctIndex;
    session.completedAt = '2026-11-16T16:00:00.000Z';
    const participant: QuizParticipant = { version: 1, email: ' Learner@Example.com ', consentAt: '2026-11-16T15:00:00.000Z' };
    const payload = buildQuizResultPayload(session, participant, 35, 'https://example.com/#quiz');
    expect(payload).toMatchObject({ email: 'learner@example.com', score: 35, total: 35, percentage: 100, masteredTotal: 35 });
    expect(payload.incorrectQuestionIds).toEqual([]);
  });

  it('posts an encoded payload only when an Apps Script endpoint is configured', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response());
    vi.stubGlobal('fetch', fetchMock);
    const payload = { sessionId: 'test' } as never;
    expect(await submitQuizResult(payload, '')).toBe('unavailable');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await submitQuizResult(payload, 'https://script.google.com/macros/s/deployment-id/exec')).toBe('sent');
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST', mode: 'no-cors', keepalive: true });
  });
});
