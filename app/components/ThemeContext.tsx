'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type ThemeContextType = {
  isdark: boolean | null;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isdark, setIsdark] = useState<boolean | null>(null);

  useEffect(() => {
    const storedTheme = localStorage.getItem('isdark');
    const parsedTheme = storedTheme ? JSON.parse(storedTheme) : false;
    setIsdark(parsedTheme);
  }, []);

  const toggleTheme = () => {
    setIsdark((prev) => {
      const newTheme = !prev;
      localStorage.setItem('isdark', JSON.stringify(newTheme));
      return newTheme;
    });
  };

  return (
    <ThemeContext.Provider value={{ isdark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}