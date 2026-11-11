export const RacePhase = {
  INITIALIZING: 'INITIALIZING',
  READY: 'READY',
  COUNTDOWN: 'COUNTDOWN',
  ACTIVE: 'ACTIVE',
  FINISHED: 'FINISHED',
};

export const SubmissionStatus = {
  IDLE: 'IDLE',
  SUBMITTING: 'SUBMITTING',
  FINISHED: 'FINISHED',
};

export const Verdict = {
  ACCEPTED: 'ACCEPTED',
  WRONG_ANSWER: 'WRONG_ANSWER',
  RUNTIME_ERROR: 'RUNTIME_ERROR',
  COMPILATION_ERROR: 'COMPILATION_ERROR',
};

export const AVAILABLE_LANGUAGES = [
  { id: 'cpp', label: 'C++' },
  { id: 'java', label: 'Java' },
  { id: 'python', label: 'Python' },
];