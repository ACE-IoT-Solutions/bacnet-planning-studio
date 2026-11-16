// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import QuizPage from './QuizPage.vue';
import {
  BACNET_QUIZ_PROGRESS_KEY,
  BACNET_QUIZ_PARTICIPANT_KEY,
  BACNET_QUIZ_SESSION_KEY,
  bacnetQuizQuestions,
  bacnetQuizQuestionById,
  type QuizProgress,
  type QuizSession
} from '../lib/bacnet-quiz';

describe('QuizPage', () => {
  const values = new Map<string, string>();
  const writeText = vi.fn<(_: string) => Promise<void>>();
  const writeImage = vi.fn<(_: ClipboardItem[]) => Promise<void>>();

  beforeEach(() => {
    vi.restoreAllMocks();
    values.clear();
    values.set(BACNET_QUIZ_PARTICIPANT_KEY, JSON.stringify({ version: 1, email: 'learner@example.com', consentAt: '2026-11-16T15:00:00.000Z' }));
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key)
    });
    writeText.mockReset();
    writeText.mockResolvedValue(undefined);
    writeImage.mockReset();
    writeImage.mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText, write: writeImage } });
    vi.stubGlobal('ClipboardItem', class {
      constructor(public readonly items: Record<string, Blob>) {}
    });
    const gradient = { addColorStop: vi.fn() };
    const context = {
      createLinearGradient: vi.fn(() => gradient), fillRect: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
      stroke: vi.fn(), arc: vi.fn(), closePath: vi.fn(), fillText: vi.fn(), fillStyle: '', strokeStyle: '', lineWidth: 1,
      font: '', textAlign: 'left'
    };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => context as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(callback => callback(new Blob(['png'], { type: 'image/png' })));
  });

  it('requires a valid-looking email and privacy acknowledgement before showing questions', async () => {
    values.delete(BACNET_QUIZ_PARTICIPANT_KEY);
    const wrapper = mount(QuizPage);
    expect(wrapper.text()).toContain('Enter your email to begin');
    expect(wrapper.find('.quiz-question').exists()).toBe(false);
    expect(wrapper.get('a').attributes('href')).toContain('privacypolicyonline.com');

    await wrapper.get('input[type="email"]').setValue('learner@example.com');
    await wrapper.get('input[type="checkbox"]').setValue(true);
    await wrapper.get('.quiz-email-gate form').trigger('submit');

    expect(wrapper.text()).toContain('Question 1 of 35');
    expect(JSON.parse(values.get(BACNET_QUIZ_PARTICIPANT_KEY)!).email).toBe('learner@example.com');
  });

  it('creates a 35-question session and persists a correct answer', async () => {
    const wrapper = mount(QuizPage);
    const session = JSON.parse(values.get(BACNET_QUIZ_SESSION_KEY)!) as QuizSession;
    expect(session.questionIds).toHaveLength(35);
    expect(wrapper.text()).toContain('Question 1 of 35');

    const question = bacnetQuizQuestionById.get(session.questionIds[0])!;
    await wrapper.findAll<HTMLInputElement>('input[type="radio"]')[question.correctIndex].setValue();
    await wrapper.get('form').trigger('submit');

    expect(wrapper.text()).toContain('Correct');
    const progress = JSON.parse(values.get(BACNET_QUIZ_PROGRESS_KEY)!) as QuizProgress;
    expect(progress.answers[question.id]).toMatchObject({ attempts: 1, correctAnswers: 1, mastered: true });
  });

  it('resumes the saved question and answer after remounting', async () => {
    const firstMount = mount(QuizPage);
    const session = JSON.parse(values.get(BACNET_QUIZ_SESSION_KEY)!) as QuizSession;
    const question = bacnetQuizQuestionById.get(session.questionIds[0])!;
    await firstMount.findAll<HTMLInputElement>('input[type="radio"]')[question.correctIndex].setValue();
    await firstMount.get('form').trigger('submit');
    firstMount.unmount();

    const resumed = mount(QuizPage);
    expect(resumed.text()).toContain('Correct');
    expect(resumed.findAll<HTMLInputElement>('input[type="radio"]').every(input => input.attributes('disabled') !== undefined)).toBe(true);
  });

  it('copies a score badge without exposing the participant email', async () => {
    const questions = bacnetQuizQuestions.slice(0, 35);
    const answers = Object.fromEntries(questions.map((question, index) => [question.id, index < 30 ? question.correctIndex : (question.correctIndex + 1) % 4]));
    values.set(BACNET_QUIZ_PROGRESS_KEY, JSON.stringify({
      version: 1,
      answers: Object.fromEntries(questions.slice(0, 30).map(question => [question.id, { attempts: 1, correctAnswers: 1, mastered: true, lastSelectedIndex: question.correctIndex }]))
    }));
    values.set(BACNET_QUIZ_SESSION_KEY, JSON.stringify({
      version: 1,
      sessionId: 'completed-score',
      questionIds: questions.map(question => question.id),
      answers,
      currentIndex: 34,
      startedAt: '2026-11-16T15:00:00.000Z',
      completedAt: '2026-11-16T15:30:00.000Z',
      deliveryStatus: 'sent',
      deliveryAttemptedAt: '2026-11-16T15:30:01.000Z'
    }));

    const wrapper = mount(QuizPage);
    expect(wrapper.text()).toContain('86% · Quiz complete');
    expect(wrapper.text()).toContain('Unlock at 100 / 100 mastered');
    expect(wrapper.find('[data-testid="copy-mastery-badge"]').exists()).toBe(false);

    await wrapper.get('[data-testid="copy-quiz-badge"]').trigger('click');
    await flushPromises();

    expect(writeText).toHaveBeenCalledOnce();
    expect(writeText.mock.calls[0][0]).toContain('30/35 (86%)');
    expect(writeText.mock.calls[0][0]).toContain('#BACnet #BuildingAutomation #BAS');
    expect(writeText.mock.calls[0][0]).toContain('/quiz.html');
    expect(writeText.mock.calls[0][0]).not.toContain('learner@example.com');
    expect(wrapper.text()).toContain('Badge copied to your clipboard.');

    await wrapper.get('[data-testid="copy-quiz-image"]').trigger('click');
    await flushPromises();
    expect(writeImage).toHaveBeenCalledOnce();
    expect(writeImage.mock.calls[0][0][0]).toBeInstanceOf(ClipboardItem);
    expect(wrapper.text()).toContain('Badge image copied. Paste it into your social post.');
  });

  it('unlocks a separate mastery badge after all 100 questions are answered correctly', async () => {
    const questions = bacnetQuizQuestions.slice(0, 35);
    values.set(BACNET_QUIZ_PROGRESS_KEY, JSON.stringify({
      version: 1,
      answers: Object.fromEntries(bacnetQuizQuestions.map(question => [question.id, { attempts: 1, correctAnswers: 1, mastered: true, lastSelectedIndex: question.correctIndex }]))
    }));
    values.set(BACNET_QUIZ_SESSION_KEY, JSON.stringify({
      version: 1,
      sessionId: 'completed-mastery',
      questionIds: questions.map(question => question.id),
      answers: Object.fromEntries(questions.map(question => [question.id, question.correctIndex])),
      currentIndex: 34,
      startedAt: '2026-11-16T15:00:00.000Z',
      completedAt: '2026-11-16T15:30:00.000Z',
      deliveryStatus: 'sent',
      deliveryAttemptedAt: '2026-11-16T15:30:01.000Z'
    }));

    const wrapper = mount(QuizPage);
    expect(wrapper.text()).toContain('100% · Question bank mastered');
    await wrapper.get('[data-testid="copy-mastery-badge"]').trigger('click');
    await flushPromises();

    expect(writeText.mock.calls[0][0]).toContain('100/100 Question Bank Mastery');
    expect(writeText.mock.calls[0][0]).toContain('all 100 questions');
  });
});
