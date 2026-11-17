import {
  BACNET_QUIZ_BANK_VERSION,
  bacnetQuizQuestionById,
  type QuizParticipant,
  type QuizSession
} from './bacnet-quiz';

export const QUIZ_PRIVACY_POLICY_URL = 'https://www.privacypolicyonline.com/live.php?token=IuZqxCYZLiM2psa7Bf3mOhJ1tESPxPQU';
export const QUIZ_RESULTS_ENDPOINT = __QUIZ_RESULTS_ENDPOINT__;

export interface QuizResultPayload {
  version: 1;
  mode: 'standard' | 'elite';
  sessionId: string;
  email: string;
  consentAt: string;
  startedAt: string;
  completedAt: string;
  score: number;
  total: number;
  percentage: number;
  masteredTotal: number;
  bankVersion: number;
  questionIds: string[];
  answers: Record<string, number>;
  incorrectQuestionIds: string[];
  privacyPolicyUrl: string;
  sourceUrl: string;
  website: string;
}

export type QuizResultDeliveryStatus = 'sent' | 'unavailable' | 'failed';

export interface QuizResultDelivery {
  status: QuizResultDeliveryStatus;
  message: string;
  confirmed: boolean;
  duplicate?: boolean;
  requestId?: string;
}

export function normalizeQuizEmail(value: string): string {
  return value.trim().toLocaleLowerCase();
}

export function isValidQuizEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeQuizEmail(value));
}

export function isQuizResultsEndpointConfigured(endpoint = QUIZ_RESULTS_ENDPOINT): boolean {
  return /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(endpoint);
}

export function buildQuizResultPayload(
  session: QuizSession,
  participant: QuizParticipant,
  masteredTotal: number,
  sourceUrl = typeof window === 'undefined' ? '' : window.location.href
): QuizResultPayload {
  if (!session.completedAt) throw new Error('Cannot submit an incomplete quiz session.');
  const score = session.questionIds.filter(id => {
    const question = bacnetQuizQuestionById.get(id);
    return question && session.answers[id] === question.correctIndex;
  }).length;
  const incorrectQuestionIds = session.questionIds.filter(id => {
    const question = bacnetQuizQuestionById.get(id);
    return !question || session.answers[id] !== question.correctIndex;
  });
  return {
    version: 1,
    mode: session.mode,
    sessionId: session.sessionId,
    email: normalizeQuizEmail(participant.email),
    consentAt: participant.consentAt,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    score,
    total: session.questionIds.length,
    percentage: Number(((score / session.questionIds.length) * 100).toFixed(1)),
    masteredTotal,
    bankVersion: BACNET_QUIZ_BANK_VERSION,
    questionIds: [...session.questionIds],
    answers: { ...session.answers },
    incorrectQuestionIds,
    privacyPolicyUrl: QUIZ_PRIVACY_POLICY_URL,
    sourceUrl,
    website: ''
  };
}

export async function submitQuizResult(
  payload: QuizResultPayload,
  endpoint = QUIZ_RESULTS_ENDPOINT
): Promise<QuizResultDelivery> {
  if (!isQuizResultsEndpointConfigured(endpoint)) return {
    status: 'unavailable',
    message: 'The results receiver is not configured in this build.',
    confirmed: false
  };
  try {
    const body = new URLSearchParams({ payload: JSON.stringify(payload) });
    const response = await fetch(endpoint, { method: 'POST', body, keepalive: true });
    let result: { ok?: boolean; error?: string; duplicate?: boolean; requestId?: string };
    try {
      result = await response.json() as typeof result;
    } catch {
      return {
        status: 'failed',
        message: `The results receiver returned an unreadable response (HTTP ${response.status}).`,
        confirmed: false
      };
    }
    if (!response.ok || result.ok !== true) return {
      status: 'failed',
      message: result.error || `The results receiver rejected the submission (HTTP ${response.status}).`,
      confirmed: false,
      requestId: result.requestId
    };
    return {
      status: 'sent',
      message: result.duplicate ? 'This quiz session was already stored.' : 'The results receiver confirmed that this quiz was stored.',
      confirmed: true,
      duplicate: result.duplicate,
      requestId: result.requestId
    };
  } catch (error) {
    const detail = error instanceof Error && error.message ? ` ${error.message}` : '';
    return {
      status: 'failed',
      message: `The browser could not reach or read the results receiver.${detail}`,
      confirmed: false
    };
  }
}
