<template>
  <section class="quiz-page">
    <div class="glass-card quiz-hero">
      <div>
        <p class="eyebrow">BACNET COMPETENCY CHECK</p>
        <h2>Test practical protocol knowledge</h2>
        <p>Each quiz draws 35 questions from the {{ bacnetQuizQuestions.length }}-question review bank. Questions answered correctly stay out of the draw until the unseen pool runs low.</p>
      </div>
      <div class="quiz-hero__metrics" aria-label="Quiz progress">
        <div><strong>{{ bacnetQuizQuestions.length }}</strong><span>question bank</span></div>
        <div><strong>{{ BACNET_QUIZ_SIZE }}</strong><span>per quiz</span></div>
        <div><strong>{{ masteredCount }}</strong><span>mastered</span></div>
      </div>
    </div>

    <div class="quiz-mastery glass-card">
      <div>
        <strong>{{ masteredCount }} of {{ bacnetQuizQuestions.length }} answered correctly</strong>
        <span>{{ remainingCount ? `${remainingCount} still prioritized` : 'All questions have been seen correctly; future quizzes recycle the full bank.' }}</span>
      </div>
      <div class="quiz-mastery__track" role="progressbar" :aria-valuenow="masteredCount" aria-valuemin="0" :aria-valuemax="bacnetQuizQuestions.length">
        <span :style="{ width: `${masteryPercent}%` }"></span>
      </div>
    </div>

    <div v-if="!participant" class="glass-card quiz-email-gate">
      <div>
        <p class="eyebrow">SAVE YOUR RESULTS</p>
        <h2>Enter your email to begin</h2>
        <p>We use your email to save each quiz result to the BACnet Studio learning record and associated Pipedrive contact. This does not subscribe you to marketing.</p>
      </div>
      <form @submit.prevent="registerParticipant">
        <label class="quiz-email-field">
          <span>Email address</span>
          <input v-model.trim="emailInput" type="email" required autocomplete="email" placeholder="you@example.com" @input="emailError = ''">
        </label>
        <label class="quiz-consent-field">
          <input v-model="privacyAccepted" type="checkbox" required>
          <span>I agree to the storage of my email and quiz results as described in the <a :href="QUIZ_PRIVACY_POLICY_URL" target="_blank" rel="noopener noreferrer">privacy policy</a>.</span>
        </label>
        <label class="quiz-honeypot" aria-hidden="true">
          <span>Website</span>
          <input v-model="honeypot" type="text" tabindex="-1" autocomplete="off">
        </label>
        <p v-if="emailError" class="quiz-email-error" role="alert">{{ emailError }}</p>
        <AppButton variant="primary" type="submit">Start competency quiz</AppButton>
      </form>
    </div>

    <div v-else-if="!session.completedAt && currentQuestion" class="glass-card quiz-card">
      <div class="quiz-card__meta">
        <span>Question {{ session.currentIndex + 1 }} of {{ session.questionIds.length }}</span>
        <span>{{ currentQuestion.category }}</span>
        <span :class="`quiz-difficulty quiz-difficulty--${currentQuestion.difficulty}`">{{ currentQuestion.difficulty }}</span>
        <button type="button" class="quiz-change-email" @click="changeEmail">{{ participant.email }}</button>
      </div>
      <div class="quiz-session-progress" aria-hidden="true"><span :style="{ width: `${sessionPercent}%` }"></span></div>

      <form @submit.prevent="submitAnswer">
        <fieldset class="quiz-question">
          <legend>{{ currentQuestion.prompt }}</legend>
          <label
            v-for="(option, optionIndex) in currentQuestion.options"
            :key="option"
            class="quiz-option"
            :class="optionClass(optionIndex)"
          >
            <input
              v-model="selectedIndex"
              type="radio"
              name="quiz-answer"
              :value="optionIndex"
              :disabled="hasAnsweredCurrent"
            >
            <span class="quiz-option__letter">{{ optionLetter(optionIndex) }}</span>
            <span>{{ option }}</span>
          </label>
        </fieldset>

        <div v-if="hasAnsweredCurrent" class="quiz-feedback" :class="currentAnswerIsCorrect ? 'quiz-feedback--correct' : 'quiz-feedback--incorrect'" aria-live="polite">
          <strong>{{ currentAnswerIsCorrect ? 'Correct' : 'Not quite' }}</strong>
          <p v-if="!currentAnswerIsCorrect">Correct answer: {{ optionLetter(currentQuestion.correctIndex) }}. {{ currentQuestion.options[currentQuestion.correctIndex] }}</p>
          <p>{{ currentQuestion.explanation }}</p>
        </div>

        <div class="quiz-actions">
          <AppButton v-if="!hasAnsweredCurrent" variant="primary" type="submit" :disabled="selectedIndex === null">Check answer</AppButton>
          <AppButton v-else variant="primary" @click="advanceQuiz">{{ isLastQuestion ? 'View results' : 'Next question' }}</AppButton>
          <span>Your answer is saved in this browser as soon as it is checked.</span>
        </div>
      </form>
    </div>

    <div v-else-if="session.completedAt" class="quiz-results">
      <div class="glass-card quiz-results__summary">
        <p class="eyebrow">QUIZ COMPLETE</p>
        <h2>{{ sessionScore }} / {{ session.questionIds.length }}</h2>
        <p>{{ scoreMessage }}</p>
        <div class="quiz-delivery" :class="`quiz-delivery--${session.deliveryStatus ?? 'sending'}`" aria-live="polite">
          <span v-if="session.deliveryStatus === 'sent'">Results sent for processing for {{ participant?.email }}.</span>
          <span v-else-if="session.deliveryStatus === 'failed'">Results are saved in this browser, but could not be sent.</span>
          <span v-else-if="session.deliveryStatus === 'unavailable'">Results are saved in this browser. Remote collection is not configured in this build.</span>
          <span v-else>Sending results…</span>
          <button v-if="session.deliveryStatus === 'failed' || session.deliveryStatus === 'unavailable'" type="button" @click="deliverQuizResult">Try again</button>
        </div>
        <div class="quiz-actions">
          <AppButton variant="primary" @click="startNewQuiz">Start another 35</AppButton>
          <AppButton variant="quiet" @click="resetLearningHistory">Reset learning history</AppButton>
        </div>
      </div>

      <div v-if="missedQuestions.length" class="glass-card quiz-review">
        <h3>Review missed questions</h3>
        <article v-for="question in missedQuestions" :key="question.id">
          <div><span>{{ question.id }}</span><span>{{ question.category }}</span></div>
          <h4>{{ question.prompt }}</h4>
          <p><strong>Correct answer:</strong> {{ question.options[question.correctIndex] }}</p>
          <p>{{ question.explanation }}</p>
        </article>
      </div>
      <div v-else class="glass-card quiz-review quiz-review--perfect">
        <h3>Perfect round</h3>
        <p>All 35 answers were correct. Those questions are now deprioritized while any unseen questions remain.</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import AppButton from './AppButton.vue';
import {
  BACNET_QUIZ_PROGRESS_KEY,
  BACNET_QUIZ_PARTICIPANT_KEY,
  BACNET_QUIZ_SESSION_KEY,
  BACNET_QUIZ_SIZE,
  bacnetQuizQuestionById,
  bacnetQuizQuestions,
  createQuizSession,
  parseQuizParticipant,
  parseQuizProgress,
  parseQuizSession,
  recordQuizAnswer
} from '../lib/bacnet-quiz';
import {
  QUIZ_PRIVACY_POLICY_URL,
  buildQuizResultPayload,
  isValidQuizEmail,
  normalizeQuizEmail,
  submitQuizResult
} from '../lib/quiz-results';

function readStorage(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

function writeStorage(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Progress remains usable for this session. */ }
}

function removeStorage(key: string) {
  try { localStorage.removeItem(key); } catch { /* Ignore storage restrictions. */ }
}

const progress = ref(parseQuizProgress(readStorage(BACNET_QUIZ_PROGRESS_KEY)));
const session = ref(parseQuizSession(readStorage(BACNET_QUIZ_SESSION_KEY)) ?? createQuizSession(progress.value));
const participant = ref(parseQuizParticipant(readStorage(BACNET_QUIZ_PARTICIPANT_KEY)));
const selectedIndex = ref<number | null>(null);
const emailInput = ref(participant.value?.email ?? '');
const privacyAccepted = ref(Boolean(participant.value));
const emailError = ref('');
const honeypot = ref('');

const currentQuestion = computed(() => bacnetQuizQuestionById.get(session.value.questionIds[session.value.currentIndex]));
const currentAnswer = computed(() => currentQuestion.value ? session.value.answers[currentQuestion.value.id] : undefined);
const hasAnsweredCurrent = computed(() => currentAnswer.value !== undefined);
const currentAnswerIsCorrect = computed(() => currentQuestion.value ? currentAnswer.value === currentQuestion.value.correctIndex : false);
const isLastQuestion = computed(() => session.value.currentIndex === session.value.questionIds.length - 1);
const masteredCount = computed(() => bacnetQuizQuestions.filter(question => progress.value.answers[question.id]?.mastered).length);
const remainingCount = computed(() => bacnetQuizQuestions.length - masteredCount.value);
const masteryPercent = computed(() => (masteredCount.value / bacnetQuizQuestions.length) * 100);
const sessionPercent = computed(() => ((session.value.currentIndex + (hasAnsweredCurrent.value ? 1 : 0)) / session.value.questionIds.length) * 100);
const sessionQuestions = computed(() => session.value.questionIds.flatMap(id => {
  const question = bacnetQuizQuestionById.get(id);
  return question ? [question] : [];
}));
const sessionScore = computed(() => sessionQuestions.value.filter(question => session.value.answers[question.id] === question.correctIndex).length);
const missedQuestions = computed(() => sessionQuestions.value.filter(question => session.value.answers[question.id] !== question.correctIndex));
const scoreMessage = computed(() => {
  const percent = sessionScore.value / session.value.questionIds.length;
  if (percent >= 0.9) return 'Strong command of BACnet concepts and field application.';
  if (percent >= 0.75) return 'Solid foundation. Review the missed explanations before the next round.';
  return 'Use the missed-question review to target the topics that need another pass.';
});

watch(currentQuestion, question => {
  selectedIndex.value = question ? (session.value.answers[question.id] ?? null) : null;
}, { immediate: true });
watch(progress, value => writeStorage(BACNET_QUIZ_PROGRESS_KEY, value), { deep: true, immediate: true });
watch(session, value => writeStorage(BACNET_QUIZ_SESSION_KEY, value), { deep: true, immediate: true });
watch(participant, value => {
  if (value) writeStorage(BACNET_QUIZ_PARTICIPANT_KEY, value);
}, { deep: true, immediate: true });
watch([() => session.value.completedAt, () => participant.value?.email], () => {
  if (session.value.completedAt && participant.value && !session.value.deliveryAttemptedAt) void deliverQuizResult();
}, { immediate: true });

function optionLetter(index: number) {
  return String.fromCharCode(65 + index);
}

function optionClass(optionIndex: number) {
  if (!hasAnsweredCurrent.value || !currentQuestion.value) return { 'quiz-option--selected': selectedIndex.value === optionIndex };
  return {
    'quiz-option--correct': optionIndex === currentQuestion.value.correctIndex,
    'quiz-option--incorrect': optionIndex === currentAnswer.value && optionIndex !== currentQuestion.value.correctIndex
  };
}

function submitAnswer() {
  if (!currentQuestion.value || selectedIndex.value === null || hasAnsweredCurrent.value) return;
  session.value.answers = { ...session.value.answers, [currentQuestion.value.id]: selectedIndex.value };
  progress.value = recordQuizAnswer(progress.value, currentQuestion.value, selectedIndex.value);
}

function registerParticipant() {
  if (honeypot.value) return;
  if (!isValidQuizEmail(emailInput.value)) {
    emailError.value = 'Enter a valid-looking email address.';
    return;
  }
  if (!privacyAccepted.value) {
    emailError.value = 'Accept the privacy policy to continue.';
    return;
  }
  participant.value = {
    version: 1,
    email: normalizeQuizEmail(emailInput.value),
    consentAt: new Date().toISOString()
  };
  if (!Object.keys(session.value.answers).length) session.value.startedAt = new Date().toISOString();
}

function changeEmail() {
  emailInput.value = participant.value?.email ?? '';
  privacyAccepted.value = false;
  participant.value = null;
  removeStorage(BACNET_QUIZ_PARTICIPANT_KEY);
}

function advanceQuiz() {
  if (!hasAnsweredCurrent.value) return;
  if (isLastQuestion.value) {
    session.value.completedAt = new Date().toISOString();
    return;
  }
  session.value.currentIndex += 1;
}

function startNewQuiz() {
  session.value = createQuizSession(progress.value);
}

async function deliverQuizResult() {
  if (!participant.value || !session.value.completedAt || session.value.deliveryStatus === 'sending') return;
  session.value.deliveryStatus = 'sending';
  session.value.deliveryAttemptedAt = new Date().toISOString();
  const payload = buildQuizResultPayload(session.value, participant.value, masteredCount.value);
  session.value.deliveryStatus = await submitQuizResult(payload);
}

function resetLearningHistory() {
  if (!window.confirm('Reset all saved quiz answers and mastery progress in this browser?')) return;
  progress.value = { version: 1, answers: {} };
  session.value = createQuizSession(progress.value);
}
</script>

<style scoped>
.quiz-page { display: grid; gap: 1rem; }
.quiz-hero { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 2rem; align-items: center; padding: 1.5rem; }
.quiz-hero h2, .quiz-results h2 { font: 800 clamp(1.7rem, 4vw, 2.5rem) var(--font-heading); line-height: 1.05; }
.quiz-hero p:not(.eyebrow) { max-width: 54rem; margin-top: 0.65rem; color: var(--text-secondary); }
.quiz-hero__metrics { display: grid; grid-template-columns: repeat(3, minmax(6rem, 1fr)); gap: 0.6rem; }
.quiz-hero__metrics div { padding: 0.85rem; border: 1px solid var(--border-color); border-radius: var(--radius-lg); background: rgba(255,255,255,0.025); text-align: center; }
.quiz-hero__metrics strong { display: block; color: var(--primary); font: 800 1.6rem var(--font-heading); }
.quiz-hero__metrics span { color: var(--text-muted); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em; }
.quiz-mastery { display: grid; grid-template-columns: minmax(16rem, 0.65fr) minmax(15rem, 1.35fr); gap: 1rem; align-items: center; padding: 1rem 1.25rem; }
.quiz-mastery strong, .quiz-mastery span { display: block; }
.quiz-mastery span { color: var(--text-muted); font-size: 0.82rem; }
.quiz-mastery__track, .quiz-session-progress { overflow: hidden; height: 0.5rem; border-radius: 999px; background: rgba(255,255,255,0.08); }
.quiz-mastery__track span, .quiz-session-progress span { display: block; height: 100%; border-radius: inherit; background: var(--primary-gradient); transition: width var(--transition-normal); }
.quiz-card { max-width: 62rem; width: 100%; margin: 0 auto; padding: clamp(1.2rem, 3vw, 2rem); }
.quiz-email-gate { display: grid; grid-template-columns: minmax(0, 1fr) minmax(18rem, 0.85fr); gap: 2rem; max-width: 62rem; width: 100%; margin: 0 auto; padding: clamp(1.2rem, 3vw, 2rem); }
.quiz-email-gate h2 { font: 800 clamp(1.5rem, 3vw, 2rem) var(--font-heading); }
.quiz-email-gate p:not(.eyebrow) { margin-top: 0.55rem; color: var(--text-secondary); }
.quiz-email-gate form { display: grid; gap: 0.9rem; align-content: start; }
.quiz-email-field { display: grid; gap: 0.35rem; color: var(--text-secondary); font-size: 0.82rem; font-weight: 700; }
.quiz-email-field input { width: 100%; min-height: 2.8rem; padding: 0.65rem 0.75rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); background: var(--ace-bg-soft); color: var(--text-primary); }
.quiz-email-field input:focus-visible { border-color: var(--secondary); outline: 3px solid var(--ace-focus); outline-offset: 1px; }
.quiz-consent-field { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 0.65rem; align-items: start; color: var(--text-secondary); font-size: 0.78rem; }
.quiz-consent-field input { margin-top: 0.22rem; accent-color: var(--primary); }
.quiz-consent-field a { color: var(--secondary); }
.quiz-honeypot { position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden; }
.quiz-email-error { color: var(--error) !important; font-weight: 700; }
.quiz-card__meta { display: flex; flex-wrap: wrap; gap: 0.45rem 0.7rem; align-items: center; color: var(--text-muted); font: 700 0.72rem var(--font-heading); text-transform: uppercase; letter-spacing: 0.06em; }
.quiz-card__meta span + span { padding-left: 0.7rem; border-left: 1px solid var(--border-color); }
.quiz-change-email { margin-left: auto; padding: 0; border: 0; border-bottom: 1px dotted currentColor; background: none; color: var(--secondary); cursor: pointer; font: 650 0.72rem var(--font-heading); text-transform: none; letter-spacing: 0; }
.quiz-difficulty--foundation { color: var(--secondary); }
.quiz-difficulty--intermediate { color: var(--warning); }
.quiz-difficulty--advanced { color: #ff8c66; }
.quiz-session-progress { margin: 0.8rem 0 1.4rem; height: 0.3rem; }
.quiz-question { display: grid; gap: 0.7rem; border: 0; }
.quiz-question legend { margin-bottom: 1.15rem; color: var(--text-primary); font: 750 clamp(1.2rem, 3vw, 1.65rem) var(--font-heading); line-height: 1.3; }
.quiz-option { display: grid; grid-template-columns: auto auto minmax(0, 1fr); gap: 0.75rem; align-items: center; min-height: 3.4rem; padding: 0.7rem 0.9rem; border: 1px solid var(--border-color); border-radius: var(--radius-lg); background: rgba(255,255,255,0.025); cursor: pointer; transition: border-color var(--transition-fast), background var(--transition-fast), transform var(--transition-fast); }
.quiz-option:hover { border-color: var(--ace-border-strong); background: rgba(255,255,255,0.045); transform: translateY(-1px); }
.quiz-option input { accent-color: var(--primary); }
.quiz-option__letter { display: grid; place-items: center; width: 1.8rem; height: 1.8rem; border-radius: 50%; background: var(--ace-bg-soft); color: var(--text-secondary); font: 800 0.78rem var(--font-heading); }
.quiz-option--selected { border-color: rgba(var(--primary-rgb), 0.7); background: var(--ace-primary-soft); }
.quiz-option--correct { border-color: rgba(20,174,92,0.75); background: var(--success-bg); }
.quiz-option--incorrect { border-color: rgba(246,81,29,0.8); background: var(--error-bg); }
.quiz-option--correct .quiz-option__letter { background: var(--success); color: white; }
.quiz-option--incorrect .quiz-option__letter { background: var(--error); color: white; }
.quiz-feedback { margin-top: 1rem; padding: 1rem; border-left: 3px solid; border-radius: 0 var(--radius-lg) var(--radius-lg) 0; }
.quiz-feedback--correct { border-color: var(--success); background: var(--success-bg); }
.quiz-feedback--incorrect { border-color: var(--error); background: var(--error-bg); }
.quiz-feedback strong { font: 800 1rem var(--font-heading); }
.quiz-feedback p { margin-top: 0.35rem; color: var(--text-secondary); }
.quiz-actions { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; margin-top: 1.2rem; }
.quiz-actions > span { color: var(--text-muted); font-size: 0.78rem; }
.quiz-results { display: grid; gap: 1rem; max-width: 62rem; width: 100%; margin: 0 auto; }
.quiz-results__summary, .quiz-review { padding: clamp(1.2rem, 3vw, 2rem); }
.quiz-results__summary > p:not(.eyebrow) { margin-top: 0.5rem; color: var(--text-secondary); }
.quiz-delivery { display: flex; flex-wrap: wrap; gap: 0.45rem 0.8rem; align-items: center; margin-top: 0.9rem; padding: 0.7rem 0.8rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); color: var(--text-secondary); font-size: 0.8rem; }
.quiz-delivery--sent { border-color: rgba(20,174,92,0.45); background: var(--success-bg); }
.quiz-delivery--failed { border-color: rgba(246,81,29,0.5); background: var(--error-bg); }
.quiz-delivery button { padding: 0; border: 0; border-bottom: 1px dotted currentColor; background: none; color: var(--secondary); cursor: pointer; }
.quiz-review h3 { font: 800 1.25rem var(--font-heading); }
.quiz-review article { padding: 1rem 0; border-bottom: 1px solid var(--border-color); }
.quiz-review article:last-child { border-bottom: 0; padding-bottom: 0; }
.quiz-review article div { display: flex; gap: 0.55rem; color: var(--text-muted); font: 700 0.7rem var(--font-heading); text-transform: uppercase; }
.quiz-review h4 { margin-top: 0.35rem; font: 700 1rem var(--font-heading); }
.quiz-review p { margin-top: 0.35rem; color: var(--text-secondary); }
.quiz-review--perfect { border-color: rgba(20,174,92,0.4); }
@media (max-width: 800px) {
  .quiz-hero, .quiz-mastery, .quiz-email-gate { grid-template-columns: 1fr; }
  .quiz-hero__metrics { width: 100%; }
}
@media (max-width: 520px) {
  .quiz-hero__metrics { grid-template-columns: 1fr; }
  .quiz-hero__metrics div { display: flex; justify-content: space-between; align-items: baseline; }
  .quiz-option { grid-template-columns: auto minmax(0, 1fr); }
  .quiz-option input { position: absolute; opacity: 0; pointer-events: none; }
}
</style>
