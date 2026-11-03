import { getImageUrl, initials } from '../../utils/formatters';

export default function Avatar({ name = '', src, size = 'md' }) {
  const sizes = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-14 w-14 text-base', xl: 'h-20 w-20 text-xl' };
  const url = getImageUrl(src);
  return url ? (
    <img src={url} alt={name} className={`${sizes[size]} rounded-full object-cover ring-2 ring-white`} />
  ) : (
    <div className={`${sizes[size]} rounded-full bg-brand-100 text-brand-700 font-semibold flex items-center justify-center ring-2 ring-white`}>
      {initials(name) || '?'}
    </div>
  );
}