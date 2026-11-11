export const loadEditorCode = (roomId, language) => {
  return localStorage.getItem(`coderace_${roomId}_${language}`);
};

export const saveEditorCode = (roomId, language, code) => {
  localStorage.setItem(`coderace_${roomId}_${language}`, code);
};

export const resetEditorCode = (roomId, language, defaultCode) => {
  localStorage.setItem(`coderace_${roomId}_${language}`, defaultCode);
};