import React, { useEffect, useState } from 'react';
import { Sun, Moon, Hash } from 'lucide-react';

interface HeaderProps {
  id?: string;
}

export const Header: React.FC<HeaderProps> = ({ id = 'app-header' }) => {
  const [isDark, setIsDark] = useState<boolean>(() => {
    // Check localStorage or system preference
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('tgid-theme');
      if (savedTheme) {
        return savedTheme === 'dark';
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('tgid-theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('tgid-theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  return (
    <header
      id={id}
      className="flex items-center justify-between py-5 px-4 md:px-6 border-b border-[var(--border-color)] bg-[var(--surface-color)] transition-colors duration-200"
    >
      <div className="flex items-center space-x-3" id="brand-container">
        <div
          id="logo-icon-wrapper"
          className="flex items-center justify-center w-9 h-9 rounded-xl bg-[var(--primary-color)] text-white shadow-sm"
        >
          <Hash id="logo-icon" className="w-5 h-5 stroke-[2.5]" />
        </div>
        <div className="flex flex-col">
          <span
            id="brand-name"
            className="text-lg font-bold tracking-tight text-[var(--text-color)]"
          >
            TG ID
          </span>
          <span
            id="brand-tagline"
            className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-medium"
          >
            Resolver Utility
          </span>
        </div>
      </div>

      <button
        id="theme-toggle-button"
        onClick={toggleTheme}
        className="flex items-center justify-center w-9 h-9 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-color)] hover:bg-[var(--border-color)] hover:bg-opacity-20 transition-all duration-200"
        aria-label="Toggle theme"
      >
        {isDark ? (
          <Sun id="sun-icon" className="w-4 h-4 transition-transform hover:rotate-45 duration-300" />
        ) : (
          <Moon id="moon-icon" className="w-4 h-4 transition-transform hover:-rotate-12 duration-300" />
        )}
      </button>
    </header>
  );
};
