import React, { useContext } from 'react';
import { User, Sun, Moon, Bell, LogOut } from 'lucide-react';
import { ThemeContext } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export function Header() {
  const { isDark, toggle } = useContext(ThemeContext);
  const { user, signout } = useAuth();

  return (
    <div
      className="h-[72px] px-6 flex items-center justify-end sticky top-0 z-10 backdrop-blur-xl border-b shrink-0"
      style={{
        backgroundColor: isDark ? 'rgba(14,26,43,0.8)' : 'rgba(255,255,255,0.85)',
        borderColor: 'var(--ad-border)',
      }}
    >
      {/* Right Controls */}
      <div className="flex items-center gap-3 ml-6">
        {/* Notifications */}
        <button
          className="w-10 h-10 rounded-xl border flex items-center justify-center relative transition-all"
          style={{ backgroundColor: 'var(--ad-card)', borderColor: 'var(--ad-border)' }}
        >
          <Bell className="w-4 h-4" style={{ color: 'var(--ad-text-secondary)' }} />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#4F8EF7]" />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggle}
          className="w-10 h-10 rounded-xl border flex items-center justify-center transition-all"
          style={{ backgroundColor: 'var(--ad-card)', borderColor: 'var(--ad-border)' }}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDark ? (
            <Sun className="w-4 h-4" style={{ color: 'var(--ad-warning)' }} />
          ) : (
            <Moon className="w-4 h-4" style={{ color: 'var(--ad-accent)' }} />
          )}
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all"
            style={{ backgroundColor: 'var(--ad-card)', borderColor: 'var(--ad-border)' }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #4F8EF7, #6B8DD6)' }}
            >
              <User className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-medium" style={{ color: 'var(--ad-text-primary)' }}>
              {user?.username || "User"}
            </span>
          </div>
          <button
            onClick={signout}
            className="w-10 h-10 rounded-xl border flex items-center justify-center transition-all"
            style={{ backgroundColor: 'var(--ad-card)', borderColor: 'var(--ad-border)' }}
            title="Sign out"
          >
            <LogOut className="w-4 h-4" style={{ color: 'var(--ad-text-secondary)' }} />
          </button>
        </div>
      </div>
    </div>
  );
}
