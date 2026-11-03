import { Star } from 'lucide-react';

export default function StarRating({ value = 0, onChange, size = 'md', readonly = false }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-7 w-7' };
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(n)}
          className={`${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110 transition-transform'}`}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
        >
          <Star
            className={`${sizes[size]} ${n <= value ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'}`}
          />
        </button>
      ))}
    </div>
  );
}