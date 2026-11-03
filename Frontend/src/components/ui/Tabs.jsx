export default function Tabs({ tabs = [], active, onChange }) {
  return (
    <div className="border-b border-slate-200 mb-6">
      <div className="flex gap-1 overflow-x-auto">
        {tabs.map((t) => {
          const isActive = t.value === active;
          return (
            <button
              key={t.value}
              onClick={() => onChange(t.value)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                isActive
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}