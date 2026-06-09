import { Sun, Moon } from 'lucide-react';

interface Props { isDark: boolean; onToggle: () => void; }

export default function ThemeToggle({ isDark, onToggle }: Props) {
  return (
    <button
      onClick={onToggle}
      title={isDark ? 'Light mode' : 'Dark mode'}
      style={{
        width: 38, height: 38,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 10, border: '1.5px solid',
        borderColor: isDark ? '#30363d' : '#e2e8f0',
        background: isDark ? '#161b22' : '#f8fafc',
        cursor: 'pointer', flexShrink: 0,
        transition: 'all .2s',
      }}
    >
      {isDark
        ? <Sun  size={16} color="#fbbf24" />
        : <Moon size={16} color="#6366f1" />}
    </button>
  );
}
