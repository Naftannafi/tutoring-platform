export default function Spinner({ fullscreen = false, size = 'md' }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' };
  const inner = (
    <div className={`${sizes[size]} animate-spin rounded-full border-4 border-brand-200 border-t-brand-600`} />
  );
  if (fullscreen) return <div className="flex items-center justify-center min-h-screen">{inner}</div>;
  return <div className="flex items-center justify-center p-4">{inner}</div>;
}