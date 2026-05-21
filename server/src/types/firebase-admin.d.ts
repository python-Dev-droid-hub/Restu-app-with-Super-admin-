declare module 'firebase-admin' {
  // Optional runtime dependency — stub types for production build
  const admin: {
    apps: unknown[];
    initializeApp: (config: unknown) => void;
    credential: { cert: (config: unknown) => unknown };
    messaging: () => { send: (msg: unknown) => Promise<string> };
  };
  export = admin;
}
