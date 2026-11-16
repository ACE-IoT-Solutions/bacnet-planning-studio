// @vitest-environment jsdom
import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import QuizPage from './QuizPage.vue';
import {
  BACNET_QUIZ_PROGRESS_KEY,
  BACNET_QUIZ_PARTICIPANT_KEY,
  BACNET_QUIZ_SESSION_KEY,
  bacnetQuizQuestionById,
  type QuizProgress,
  type QuizSession
} from '../lib/bacnet-quiz';

describe('QuizPage', () => {
  const values = new Map<string, string>();

  beforeEach(() => {
    values.clear();
    values.set(BACNET_QUIZ_PARTICIPANT_KEY, JSON.stringify({ version: 1, email: 'learner@example.com', consentAt: '2026-11-16T15:00:00.000Z' }));
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key)
    });
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
});
