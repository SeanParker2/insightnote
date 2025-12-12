// Mocking next/font/google
// We accept options to match the API, even if we don't use them.
export const Playfair_Display = (options?: unknown) => {
  void options; // Prevent 'unused variable' linter error
  return {
    className: 'font-serif',
    variable: '--font-playfair',
    style: { fontFamily: 'serif' }
  };
};

export const Inter = (options?: unknown) => {
  void options; // Prevent 'unused variable' linter error
  return {
    className: 'font-sans',
    variable: '--font-inter',
    style: { fontFamily: 'sans-serif' }
  };
};
