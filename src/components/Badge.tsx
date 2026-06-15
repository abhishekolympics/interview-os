interface Props {
  children: React.ReactNode;
  color?: 'brand' | 'accent' | 'warn' | 'danger' | 'gray';
}

const colors = {
  brand:  'bg-brand-500/15 text-brand-400 border-brand-500/30',
  accent: 'bg-accent-500/15 text-accent-400 border-accent-500/30',
  warn:   'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  danger: 'bg-danger-400/15 text-danger-400 border-danger-400/30',
  gray:   'bg-gray-500/15 text-gray-400 border-gray-500/30',
};

export default function Badge({ children, color = 'gray' }: Props) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-semibold border tracking-wider ${colors[color]}`}>
      {children}
    </span>
  );
}
