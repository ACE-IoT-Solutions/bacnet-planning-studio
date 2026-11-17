<template>
  <section class="quiz-page">
    <div class="glass-card quiz-hero">
      <div>
        <p class="eyebrow">BACNET COMPETENCY CHECK</p>
        <h2>Test practical protocol knowledge</h2>
        <p>The standard quiz draws 35 questions from the 100-question competency bank. Choose the optional elite mode for advanced protocol, electrical, and timing questions. Correctly answered questions stay out of that mode’s draw until its unseen pool runs low.</p>
      </div>
      <div class="quiz-hero__metrics" aria-label="Quiz progress">
        <div><strong>{{ standardQuizQuestions.length }}</strong><span>standard bank</span></div>
        <div><strong>{{ eliteQuizQuestions.length }}</strong><span>elite bank</span></div>
        <div><strong>{{ BACNET_QUIZ_SIZE }}</strong><span>per quiz</span></div>
      </div>
    </div>

    <div class="quiz-mode-selector glass-card" aria-labelledby="quiz-mode-title">
      <div>
        <p class="eyebrow">CHOOSE A MODE</p>
        <h3 id="quiz-mode-title">{{ session.mode === 'elite' ? 'Elite protocol challenge' : 'Standard competency quiz' }}</h3>
        <p>{{ modeLocked ? 'Mode is locked after the first answer in a round.' : 'You can switch modes before answering the first question.' }}</p>
      </div>
      <div class="quiz-mode-selector__options">
        <button type="button" :class="{ active: session.mode === 'standard' }" :disabled="modeLocked && session.mode !== 'standard'" @click="selectQuizMode('standard')">
          <strong>Standard</strong><span>35 from {{ standardQuizQuestions.length }}</span><small>Foundation through advanced</small>
        </button>
        <button type="button" :class="{ active: session.mode === 'elite' }" :disabled="modeLocked && session.mode !== 'elite'" @click="selectQuizMode('elite')">
          <strong>Elite</strong><span>35 from {{ eliteQuizQuestions.length }}</span><small>Optional deep technical round</small>
        </button>
      </div>
    </div>

    <div class="quiz-mastery glass-card">
      <div>
        <strong>{{ modeMasteredCount }} of {{ currentModeQuestions.length }} {{ session.mode }} questions answered correctly</strong>
        <span>{{ modeRemainingCount ? `${modeRemainingCount} still prioritized in this mode` : 'This mode is mastered; future rounds recycle its full bank.' }}</span>
      </div>
      <div class="quiz-mastery__track" role="progressbar" :aria-valuenow="modeMasteredCount" aria-valuemin="0" :aria-valuemax="currentModeQuestions.length">
        <span :style="{ width: `${modeMasteryPercent}%` }"></span>
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
        <AppButton variant="primary" type="submit">Start {{ session.mode === 'elite' ? 'elite' : 'competency' }} quiz</AppButton>
      </form>
    </div>

    <div v-else-if="!session.completedAt && currentQuestion" class="glass-card quiz-card">
      <div class="quiz-card__meta">
        <span>Question {{ session.currentIndex + 1 }} of {{ session.questionIds.length }}</span>
        <span>{{ session.mode }} mode</span>
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
          <span v-if="session.deliveryStatus === 'sent'">Results storage confirmed for {{ participant?.email }}.</span>
          <span v-else-if="session.deliveryStatus === 'failed'">Results are saved in this browser, but remote storage was not confirmed.</span>
          <span v-else-if="session.deliveryStatus === 'unavailable'">Results are saved in this browser. Remote collection is not configured in this build.</span>
          <span v-else>Sending results and waiting for confirmation…</span>
          <strong v-if="session.deliveryMessage">{{ session.deliveryMessage }}</strong>
          <button v-if="session.deliveryStatus === 'failed' || session.deliveryStatus === 'unavailable'" type="button" @click="deliverQuizResult">Try again</button>
          <details>
            <summary>Submission details</summary>
            <dl>
              <div><dt>Session</dt><dd><code>{{ session.sessionId }}</code></dd></div>
              <div><dt>Status</dt><dd>{{ session.deliveryStatus ?? 'sending' }}</dd></div>
              <div><dt>Browser network</dt><dd>{{ browserOnline ? 'online' : 'offline' }}</dd></div>
              <div><dt>Last attempt</dt><dd>{{ session.deliveryAttemptedAt || 'not attempted' }}</dd></div>
              <div><dt>Confirmed</dt><dd>{{ session.deliveryConfirmedAt || 'not confirmed' }}</dd></div>
              <div v-if="session.deliveryRequestId"><dt>Receiver request</dt><dd><code>{{ session.deliveryRequestId }}</code></dd></div>
            </dl>
          </details>
        </div>
        <section class="quiz-share" aria-labelledby="quiz-share-title">
          <div class="quiz-share__heading">
            <div>
              <h3 id="quiz-share-title">Share your achievement</h3>
              <p>Copy the post text and a score-bearing PNG. Your email is never included.</p>
            </div>
            <span class="quiz-copy-status" aria-live="polite">{{ copyStatus }}</span>
          </div>
          <div class="quiz-share__badges">
            <article class="quiz-share-card">
              <div class="quiz-share-badge quiz-share-badge--round">
                <span class="quiz-share-badge__icon" aria-hidden="true">◆</span>
                <span><small>BACNET STUDIO</small><strong>{{ scorePercentage }}% · Quiz complete</strong><em>{{ sessionScore }} of {{ session.questionIds.length }} correct</em></span>
              </div>
              <div class="quiz-share-card__actions">
                <AppButton data-testid="copy-quiz-badge" size="sm" variant="secondary" @click="copySocialBadge('quiz')">{{ copiedBadge === 'quiz' ? 'Text copied!' : 'Copy post text' }}</AppButton>
                <AppButton data-testid="copy-quiz-image" size="sm" @click="copyBadgeImage('quiz')">{{ copiedImage === 'quiz' ? 'Image copied!' : 'Copy badge image' }}</AppButton>
                <AppButton data-testid="download-quiz-image" size="sm" @click="downloadBadgeImage('quiz')">{{ downloadedImage === 'quiz' ? 'Downloaded!' : 'Download PNG' }}</AppButton>
              </div>
            </article>
            <article class="quiz-share-card" :class="{ 'quiz-share-card--locked': !hasMasteryBadge }">
              <div class="quiz-share-badge quiz-share-badge--mastery">
                <span class="quiz-share-badge__icon" aria-hidden="true">★</span>
                <span><small>BACNET STUDIO</small><strong>100% · Standard bank mastered</strong><em>All {{ standardQuizQuestions.length }} standard questions answered correctly</em></span>
              </div>
              <div v-if="hasMasteryBadge" class="quiz-share-card__actions">
                <AppButton data-testid="copy-mastery-badge" size="sm" variant="secondary" @click="copySocialBadge('mastery')">{{ copiedBadge === 'mastery' ? 'Text copied!' : 'Copy post text' }}</AppButton>
                <AppButton data-testid="copy-mastery-image" size="sm" @click="copyBadgeImage('mastery')">{{ copiedImage === 'mastery' ? 'Image copied!' : 'Copy badge image' }}</AppButton>
                <AppButton data-testid="download-mastery-image" size="sm" @click="downloadBadgeImage('mastery')">{{ downloadedImage === 'mastery' ? 'Downloaded!' : 'Download PNG' }}</AppButton>
              </div>
              <span v-else class="quiz-share-card__lock">Unlock at {{ standardQuizQuestions.length }} / {{ standardQuizQuestions.length }} standard questions mastered</span>
            </article>
          </div>
        </section>
        <div class="quiz-actions">
          <AppButton variant="primary" @click="startNewQuiz(session.mode)">Start another {{ session.mode }} 35</AppButton>
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
  createQuizSession,
  eliteQuizQuestions,
  parseQuizParticipant,
  parseQuizProgress,
  parseQuizSession,
  questionsForQuizMode,
  recordQuizAnswer,
  standardQuizQuestions,
  type QuizMode
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
const copiedBadge = ref<'quiz' | 'mastery' | null>(null);
const copiedImage = ref<'quiz' | 'mastery' | null>(null);
const downloadedImage = ref<'quiz' | 'mastery' | null>(null);
const copyStatus = ref('');

const currentQuestion = computed(() => bacnetQuizQuestionById.get(session.value.questionIds[session.value.currentIndex]));
const currentAnswer = computed(() => currentQuestion.value ? session.value.answers[currentQuestion.value.id] : undefined);
const hasAnsweredCurrent = computed(() => currentAnswer.value !== undefined);
const currentAnswerIsCorrect = computed(() => currentQuestion.value ? currentAnswer.value === currentQuestion.value.correctIndex : false);
const isLastQuestion = computed(() => session.value.currentIndex === session.value.questionIds.length - 1);
const currentModeQuestions = computed(() => questionsForQuizMode(session.value.mode));
const modeMasteredCount = computed(() => currentModeQuestions.value.filter(question => progress.value.answers[question.id]?.mastered).length);
const modeRemainingCount = computed(() => currentModeQuestions.value.length - modeMasteredCount.value);
const modeMasteryPercent = computed(() => (modeMasteredCount.value / currentModeQuestions.value.length) * 100);
const standardMasteredCount = computed(() => standardQuizQuestions.filter(question => progress.value.answers[question.id]?.mastered).length);
const modeLocked = computed(() => !session.value.completedAt && Object.keys(session.value.answers).length > 0);
const sessionPercent = computed(() => ((session.value.currentIndex + (hasAnsweredCurrent.value ? 1 : 0)) / session.value.questionIds.length) * 100);
const sessionQuestions = computed(() => session.value.questionIds.flatMap(id => {
  const question = bacnetQuizQuestionById.get(id);
  return question ? [question] : [];
}));
const sessionScore = computed(() => sessionQuestions.value.filter(question => session.value.answers[question.id] === question.correctIndex).length);
const scorePercentage = computed(() => Math.round((sessionScore.value / session.value.questionIds.length) * 100));
const hasMasteryBadge = computed(() => standardMasteredCount.value === standardQuizQuestions.length);
const browserOnline = computed(() => typeof navigator === 'undefined' || navigator.onLine !== false);
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

function selectQuizMode(mode: QuizMode) {
  if (mode === session.value.mode || modeLocked.value) return;
  session.value = createQuizSession(progress.value, Math.random, mode);
}

function startNewQuiz(mode: QuizMode = session.value.mode) {
  session.value = createQuizSession(progress.value, Math.random, mode);
}

function quizShareUrl() {
  const appDirectory = new URL(import.meta.env.BASE_URL, window.location.href);
  return new URL('quiz.html', appDirectory).toString();
}

function socialBadgeText(kind: 'quiz' | 'mastery') {
  if (kind === 'mastery') return [
    `🏆 BACnet Studio · ${standardQuizQuestions.length}/${standardQuizQuestions.length} Standard Question Bank Mastery`,
    `I correctly answered all ${standardQuizQuestions.length} standard questions in the BACnet Studio competency bank.`,
    `Test your BACnet knowledge: ${quizShareUrl()}`,
    '#BACnet #BuildingAutomation #BAS'
  ].join('\n');
  return [
    `🏅 BACnet Studio · ${session.value.mode === 'elite' ? 'Elite Quiz' : 'Quiz'} Complete · ${sessionScore.value}/${session.value.questionIds.length} (${scorePercentage.value}%)`,
    `I completed the BACnet ${session.value.mode === 'elite' ? 'elite' : 'competency'} quiz. Can you beat my score?`,
    `Take the quiz: ${quizShareUrl()}`,
    '#BACnet #BuildingAutomation #BAS'
  ].join('\n');
}

function fallbackCopy(text: string) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.readOnly = true;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  if (!copied) throw new Error('Copy command was rejected');
}

async function copySocialBadge(kind: 'quiz' | 'mastery') {
  if (kind === 'mastery' && !hasMasteryBadge.value) return;
  try {
    const text = socialBadgeText(kind);
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
    else fallbackCopy(text);
    copiedBadge.value = kind;
    copyStatus.value = 'Badge copied to your clipboard.';
  } catch {
    copiedBadge.value = null;
    copyStatus.value = 'Could not copy automatically. Check your browser clipboard permissions.';
  }
}

function drawBadgeImage(kind: 'quiz' | 'mastery') {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 627;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is unavailable');

  const background = context.createLinearGradient(0, 0, 1200, 627);
  background.addColorStop(0, '#171b24');
  background.addColorStop(0.62, '#292e3d');
  background.addColorStop(1, '#1b202b');
  context.fillStyle = background;
  context.fillRect(0, 0, 1200, 627);

  context.strokeStyle = 'rgba(127, 135, 158, 0.28)';
  context.lineWidth = 3;
  const network = [[760, 450], [875, 370], [1005, 438], [1135, 332], [1080, 525], [935, 488], [820, 535]];
  context.beginPath();
  network.forEach(([x, y], index) => index ? context.lineTo(x, y) : context.moveTo(x, y));
  context.stroke();
  for (const [x, y] of network) {
    context.beginPath();
    context.arc(x, y, 8, 0, Math.PI * 2);
    context.stroke();
  }

  context.strokeStyle = '#c1d301';
  context.lineWidth = 6;
  context.beginPath();
  for (let point = 0; point < 6; point += 1) {
    const angle = Math.PI / 3 * point - Math.PI / 2;
    const x = 1030 + Math.cos(angle) * 66;
    const y = 126 + Math.sin(angle) * 66;
    if (point) context.lineTo(x, y); else context.moveTo(x, y);
  }
  context.closePath();
  context.stroke();
  context.fillStyle = '#c1d301';
  context.font = '800 42px Montserrat, Arial, sans-serif';
  context.textAlign = 'center';
  context.fillText(kind === 'mastery' ? '★' : '✓', 1030, 141);

  context.textAlign = 'left';
  context.fillStyle = '#c1d301';
  context.font = '700 23px Montserrat, Arial, sans-serif';
  context.fillText(kind === 'mastery' ? 'BACNET STUDIO MASTERY' : session.value.mode === 'elite' ? 'BACNET ELITE CHALLENGE' : 'BACNET COMPETENCY CHECK', 70, 92);
  context.fillStyle = '#ffffff';
  context.font = '800 104px Montserrat, Arial, sans-serif';
  context.fillText(kind === 'mastery' ? `${standardQuizQuestions.length} / ${standardQuizQuestions.length}` : `${scorePercentage.value}%`, 68, 245);
  context.font = '700 48px Montserrat, Arial, sans-serif';
  context.fillText(kind === 'mastery' ? 'Standard bank mastered' : session.value.mode === 'elite' ? 'Elite quiz complete' : 'Quiz complete', 70, 326);
  context.fillStyle = '#cbd0dd';
  context.font = '500 29px Montserrat, Arial, sans-serif';
  context.fillText(kind === 'mastery'
    ? `Every standard BACnet Studio question answered correctly`
    : `${sessionScore.value} of ${session.value.questionIds.length} questions answered correctly`, 70, 383);
  context.fillStyle = '#8991a6';
  context.font = '500 20px Montserrat, Arial, sans-serif';
  context.fillText('Objects · Services · Routing · MS/TP · BACnet/SC · ARC156', 70, 500);
  context.fillText('ace-iot-solutions.github.io/bacnet-planning-studio/quiz.html', 70, 563);
  context.fillStyle = '#ffffff';
  context.font = '700 24px Montserrat, Arial, sans-serif';
  context.fillText('BACnet Studio', 930, 234);
  context.fillStyle = '#8991a6';
  context.font = '600 16px Montserrat, Arial, sans-serif';
  context.fillText('BY ACE IoT', 930, 260);
  return canvas;
}

function badgeImageBlob(kind: 'quiz' | 'mastery') {
  return new Promise<Blob>((resolve, reject) => {
    drawBadgeImage(kind).toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG encoding failed')), 'image/png');
  });
}

function saveBadgeImage(blob: Blob, kind: 'quiz' | 'mastery') {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = kind === 'mastery' ? 'bacnet-studio-100-question-mastery.png' : `bacnet-studio-quiz-${sessionScore.value}-of-${session.value.questionIds.length}.png`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function downloadBadgeImage(kind: 'quiz' | 'mastery') {
  if (kind === 'mastery' && !hasMasteryBadge.value) return;
  try {
    saveBadgeImage(await badgeImageBlob(kind), kind);
    downloadedImage.value = kind;
    copyStatus.value = 'Badge PNG downloaded.';
  } catch {
    downloadedImage.value = null;
    copyStatus.value = 'Could not create the badge image in this browser.';
  }
}

async function copyBadgeImage(kind: 'quiz' | 'mastery') {
  if (kind === 'mastery' && !hasMasteryBadge.value) return;
  try {
    const blob = await badgeImageBlob(kind);
    if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      copiedImage.value = kind;
      copyStatus.value = 'Badge image copied. Paste it into your social post.';
    } else {
      saveBadgeImage(blob, kind);
      copyStatus.value = 'Clipboard images are unavailable in this browser, so the PNG was downloaded.';
    }
  } catch {
    copiedImage.value = null;
    copyStatus.value = 'Could not create the badge image in this browser.';
  }
}

async function deliverQuizResult() {
  if (!participant.value || !session.value.completedAt || session.value.deliveryStatus === 'sending') return;
  session.value.deliveryStatus = 'sending';
  session.value.deliveryMessage = 'Waiting for the results receiver…';
  session.value.deliveryConfirmedAt = undefined;
  session.value.deliveryRequestId = undefined;
  session.value.deliveryAttemptedAt = new Date().toISOString();
  const payload = buildQuizResultPayload(session.value, participant.value, modeMasteredCount.value);
  const delivery = await submitQuizResult(payload);
  session.value.deliveryStatus = delivery.status;
  session.value.deliveryMessage = delivery.message;
  session.value.deliveryRequestId = delivery.requestId;
  session.value.deliveryConfirmedAt = delivery.confirmed ? new Date().toISOString() : undefined;
}

function resetLearningHistory() {
  if (!window.confirm('Reset all saved quiz answers and mastery progress in this browser?')) return;
  progress.value = { version: 1, answers: {} };
  session.value = createQuizSession(progress.value, Math.random, session.value.mode);
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
.quiz-mode-selector { display: grid; grid-template-columns: minmax(14rem, .7fr) minmax(22rem, 1.3fr); gap: 1rem; align-items: center; padding: 1rem 1.25rem; }
.quiz-mode-selector h3 { margin-top: .2rem; color: var(--text-primary); font: 800 1.05rem var(--font-heading); }
.quiz-mode-selector p:not(.eyebrow) { margin-top: .25rem; color: var(--text-muted); font-size: .76rem; }
.quiz-mode-selector__options { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: .65rem; }
.quiz-mode-selector__options button { display: grid; gap: .2rem; padding: .8rem; border: 1px solid var(--border-color); border-radius: var(--radius-lg); background: rgba(255,255,255,.025); color: var(--text-secondary); text-align: left; cursor: pointer; }
.quiz-mode-selector__options button.active { border-color: rgba(var(--primary-rgb),.65); background: var(--ace-primary-soft); }
.quiz-mode-selector__options button:disabled { cursor: not-allowed; opacity: .45; }
.quiz-mode-selector__options strong { color: var(--text-primary); font: 800 .9rem var(--font-heading); }.quiz-mode-selector__options span { color: var(--primary); font: 750 .75rem var(--font-heading); }.quiz-mode-selector__options small { color: var(--text-muted); font-size: .68rem; }
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
.quiz-difficulty--elite { color: var(--primary); }
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
.quiz-delivery > strong { flex-basis: 100%; color: inherit; font-weight: 650; }
.quiz-delivery button { padding: 0; border: 0; border-bottom: 1px dotted currentColor; background: none; color: var(--secondary); cursor: pointer; }
.quiz-delivery details { flex-basis: 100%; padding-top: 0.25rem; border-top: 1px solid var(--border-color); }
.quiz-delivery summary { width: fit-content; color: var(--text-muted); cursor: pointer; }
.quiz-delivery dl { display: grid; gap: 0.25rem; margin-top: 0.55rem; }
.quiz-delivery dl div { display: grid; grid-template-columns: 8rem minmax(0, 1fr); gap: 0.6rem; }
.quiz-delivery dt { color: var(--text-muted); }
.quiz-delivery dd { min-width: 0; margin: 0; overflow-wrap: anywhere; }
.quiz-share { display: grid; gap: 0.9rem; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color); }
.quiz-share__heading { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 0.5rem 1rem; align-items: end; }
.quiz-share__heading h3 { font: 800 1.05rem var(--font-heading); }
.quiz-share__heading p { margin-top: 0.2rem; color: var(--text-muted); font-size: 0.78rem; }
.quiz-copy-status { min-height: 1.1rem; color: var(--secondary); font-size: 0.75rem; }
.quiz-share__badges { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.8rem; }
.quiz-share-card { display: grid; gap: 0.65rem; align-content: space-between; padding: 0.8rem; border: 1px solid var(--border-color); border-radius: var(--radius-lg); background: rgba(255,255,255,0.02); }
.quiz-share-card__actions { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.quiz-share-card__actions > * { flex: 1 1 9rem; }
.quiz-share-badge { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 0.75rem; align-items: center; min-height: 5.25rem; padding: 0.8rem; border: 1px solid rgba(var(--primary-rgb), 0.55); border-radius: var(--radius-md); background: linear-gradient(135deg, rgba(var(--primary-rgb), 0.18), rgba(22,31,43,0.92)); box-shadow: inset 0 0 0 1px rgba(255,255,255,0.035); }
.quiz-share-badge--mastery { border-color: rgba(245,190,63,0.65); background: linear-gradient(135deg, rgba(245,190,63,0.18), rgba(22,31,43,0.94)); }
.quiz-share-badge__icon { display: grid; place-items: center; width: 2.6rem; height: 2.6rem; border: 1px solid currentColor; border-radius: 50%; color: var(--primary); font-size: 1.1rem; }
.quiz-share-badge--mastery .quiz-share-badge__icon { color: #f5be3f; }
.quiz-share-badge small, .quiz-share-badge strong, .quiz-share-badge em { display: block; }
.quiz-share-badge small { color: var(--text-muted); font: 800 0.62rem var(--font-heading); letter-spacing: 0.12em; }
.quiz-share-badge strong { margin-top: 0.16rem; color: var(--text-primary); font: 800 0.94rem var(--font-heading); }
.quiz-share-badge em { margin-top: 0.16rem; color: var(--text-secondary); font-size: 0.7rem; font-style: normal; }
.quiz-share-card--locked .quiz-share-badge { filter: saturate(0.3); opacity: 0.52; }
.quiz-share-card__lock { align-self: center; color: var(--text-muted); font-size: 0.74rem; text-align: center; }
.quiz-review h3 { font: 800 1.25rem var(--font-heading); }
.quiz-review article { padding: 1rem 0; border-bottom: 1px solid var(--border-color); }
.quiz-review article:last-child { border-bottom: 0; padding-bottom: 0; }
.quiz-review article div { display: flex; gap: 0.55rem; color: var(--text-muted); font: 700 0.7rem var(--font-heading); text-transform: uppercase; }
.quiz-review h4 { margin-top: 0.35rem; font: 700 1rem var(--font-heading); }
.quiz-review p { margin-top: 0.35rem; color: var(--text-secondary); }
.quiz-review--perfect { border-color: rgba(20,174,92,0.4); }
@media (max-width: 800px) {
  .quiz-hero, .quiz-mastery, .quiz-email-gate, .quiz-mode-selector { grid-template-columns: 1fr; }
  .quiz-hero__metrics { width: 100%; }
  .quiz-share__badges { grid-template-columns: 1fr; }
}
@media (max-width: 520px) {
  .quiz-hero__metrics { grid-template-columns: 1fr; }
  .quiz-mode-selector__options { grid-template-columns: 1fr; }
  .quiz-hero__metrics div { display: flex; justify-content: space-between; align-items: baseline; }
  .quiz-option { grid-template-columns: auto minmax(0, 1fr); }
  .quiz-option input { position: absolute; opacity: 0; pointer-events: none; }
}
</style>
