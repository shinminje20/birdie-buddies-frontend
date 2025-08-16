// src/lib/auth.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { me, requestOtp, verifyOtp, User } from "./api";
import { logout } from "./api";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signOut: () => void; // clear local state; cookie remains until backend expiry
  requestOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, code: string, name?: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType>(null!);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    me()
      .then(setUser)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signOut: async () => {
          try {
            await logout();
          } finally {
            setUser(null);
          }
        },
        requestOtp: async (email) => {
          await requestOtp(email);
        },
        verifyOtp: async (email, code, name) => {
          const u = await verifyOtp(email, code, name);
          setUser(u);
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
