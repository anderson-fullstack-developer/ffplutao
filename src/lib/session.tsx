import * as React from "react";

interface SessionValue {
  isAuthenticated: boolean;
  signIn: () => void;
  signOut: () => void;
}

const SessionContext = React.createContext<SessionValue>({
  isAuthenticated: false,
  signIn: () => {},
  signOut: () => {},
});

/** Sessão puramente visual (mock) — não existe autenticação real. */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setAuthenticated] = React.useState(false);

  const value = React.useMemo<SessionValue>(
    () => ({
      isAuthenticated,
      signIn: () => setAuthenticated(true),
      signOut: () => setAuthenticated(false),
    }),
    [isAuthenticated],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return React.useContext(SessionContext);
}
