import rawQuestions from '../data/bacnet-quiz-questions.json';

export type QuizDifficulty = 'foundation' | 'intermediate' | 'advanced';

export interface BacnetQuizQuestion {
  id: string;
  category: string;
  difficulty: QuizDifficulty;
  prompt: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
}

export interface QuizProgressEntry {
  attempts: number;
  correctAnswers: number;
  mastered: boolean;
  lastSelectedIndex: number;
}

export interface QuizProgress {
  version: 1;
  answers: Record<string, QuizProgressEntry>;
}

export interface QuizSession {
  version: 1;
  sessionId: string;
  questionIds: string[];
  answers: Record<string, number>;
  currentIndex: number;
  startedAt: string;
  completedAt?: string;
  deliveryStatus?: 'sending' | 'sent' | 'unavailable' | 'failed';
  deliveryAttemptedAt?: string;
  deliveryConfirmedAt?: string;
  deliveryMessage?: string;
  deliveryRequestId?: string;
}

export interface QuizParticipant {
  version: 1;
  email: string;
  consentAt: string;
}

export const BACNET_QUIZ_SIZE = 35;
export const BACNET_QUIZ_PROGRESS_KEY = 'bacnet-studio-quiz-progress-v1';
export const BACNET_QUIZ_SESSION_KEY = 'bacnet-studio-quiz-session-v1';
export const BACNET_QUIZ_PARTICIPANT_KEY = 'bacnet-studio-quiz-participant-v1';
export const BACNET_QUIZ_BANK_VERSION = rawQuestions.version;
export const bacnetQuizQuestions = rawQuestions.questions as BacnetQuizQuestion[];
export const bacnetQuizQuestionById = new Map(bacnetQuizQuestions.map(question => [question.id, question]));

export function emptyQuizProgress(): QuizProgress {
  return { version: 1, answers: {} };
}

export function shuffleQuestions<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export function selectQuizQuestionIds(
  questions: readonly BacnetQuizQuestion[],
  progress: QuizProgress,
  count = BACNET_QUIZ_SIZE,
  random: () => number = Math.random
): string[] {
  const eligible = questions.filter(question => !progress.answers[question.id]?.mastered);
  const mastered = questions.filter(question => progress.answers[question.id]?.mastered);
  const selected = shuffleQuestions(eligible, random).slice(0, count);
  if (selected.length < count) {
    selected.push(...shuffleQuestions(mastered, random).slice(0, count - selected.length));
  }
  return selected.map(question => question.id);
}

export function createQuizSession(progress: QuizProgress, random: () => number = Math.random): QuizSession {
  return {
    version: 1,
    sessionId: createQuizSessionId(random),
    questionIds: selectQuizQuestionIds(bacnetQuizQuestions, progress, BACNET_QUIZ_SIZE, random),
    answers: {},
    currentIndex: 0,
    startedAt: new Date().toISOString()
  };
}

export function createQuizSessionId(random: () => number = Math.random): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return `quiz-${Date.now().toString(36)}-${Math.floor(random() * 1_000_000_000).toString(36)}`;
}

export function recordQuizAnswer(
  progress: QuizProgress,
  question: BacnetQuizQuestion,
  selectedIndex: number
): QuizProgress {
  const existing = progress.answers[question.id];
  const isCorrect = selectedIndex === question.correctIndex;
  return {
    version: 1,
    answers: {
      ...progress.answers,
      [question.id]: {
        attempts: (existing?.attempts ?? 0) + 1,
        correctAnswers: (existing?.correctAnswers ?? 0) + (isCorrect ? 1 : 0),
        mastered: Boolean(existing?.mastered || isCorrect),
        lastSelectedIndex: selectedIndex
      }
    }
  };
}

export function parseQuizProgress(raw: string | null): QuizProgress {
  if (!raw) return emptyQuizProgress();
  try {
    const parsed = JSON.parse(raw) as Partial<QuizProgress>;
    if (parsed.version !== 1 || !parsed.answers || typeof parsed.answers !== 'object') return emptyQuizProgress();
    return { version: 1, answers: parsed.answers as Record<string, QuizProgressEntry> };
  } catch {
    return emptyQuizProgress();
  }
}

export function parseQuizSession(raw: string | null): QuizSession | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<QuizSession>;
    if (parsed.version !== 1 || !Array.isArray(parsed.questionIds) || !parsed.questionIds.length || !parsed.answers) return null;
    if (parsed.questionIds.some(id => !bacnetQuizQuestionById.has(id))) return null;
    const legacyUnverifiedDelivery = parsed.deliveryStatus === 'sent' && !parsed.deliveryConfirmedAt;
    return {
      version: 1,
      sessionId: typeof parsed.sessionId === 'string' && parsed.sessionId ? parsed.sessionId : createQuizSessionId(),
      questionIds: parsed.questionIds,
      answers: parsed.answers as Record<string, number>,
      currentIndex: Math.min(Math.max(Number(parsed.currentIndex) || 0, 0), parsed.questionIds.length - 1),
      startedAt: parsed.startedAt || new Date().toISOString(),
      completedAt: parsed.completedAt,
      deliveryStatus: legacyUnverifiedDelivery ? 'failed' : parsed.deliveryStatus,
      deliveryAttemptedAt: parsed.deliveryAttemptedAt,
      deliveryConfirmedAt: parsed.deliveryConfirmedAt,
      deliveryMessage: legacyUnverifiedDelivery
        ? 'This result was sent by an older build but was not verified by the receiver. Retry to confirm storage.'
        : parsed.deliveryMessage,
      deliveryRequestId: parsed.deliveryRequestId
    };
  } catch {
    return null;
  }
}

export function parseQuizParticipant(raw: string | null): QuizParticipant | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<QuizParticipant>;
    if (parsed.version !== 1 || typeof parsed.email !== 'string' || typeof parsed.consentAt !== 'string') return null;
    return { version: 1, email: parsed.email, consentAt: parsed.consentAt };
  } catch {
    return null;
  }
}
