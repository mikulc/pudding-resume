import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FileText, LayoutTemplate, Settings } from 'lucide-react';

const navItems = [
  { path: '/resumes', labelKey: 'resume:list.myResumes', icon: FileText },
  { path: '/templates', labelKey: 'homepage:footer.product.templates', icon: LayoutTemplate },
  { path: '/settings', labelKey: 'resume:list.settings', icon: Settings },
];

// The top bar remounts when changing pages. Preserve the clicked item so its
// highlight remains visible until the pointer leaves that item.
let clickedNavPath: string | null = null;

export function TopNavLinks() {
  const navigate = useNavigate();
  const { t } = useTranslation(['resume', 'homepage']);
  const [activePath, setActivePath] = useState(clickedNavPath);

  const clearClickedItem = () => {
    clickedNavPath = null;
    setActivePath(null);
  };

  return (
    <nav className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-2 md:flex">
      {navItems.map((item) => (
          <button
            key={item.path}
            type="button"
            onClick={() => {
              clickedNavPath = item.path;
              setActivePath(item.path);
              navigate(item.path);
            }}
            onMouseLeave={clearClickedItem}
            className={`inline-flex h-9 items-center justify-center rounded-full px-4 text-base font-bold tracking-normal transition-colors duration-150 ${
              activePath === item.path
                ? 'bg-[var(--theme-accent)] text-[var(--theme-accent-foreground)]'
                : 'text-gray-800 hover:!bg-[var(--theme-accent)] hover:!text-[var(--theme-accent-foreground)] dark:text-slate-200'
            }`}
          >
            {t(item.labelKey)}
          </button>
      ))}

    </nav>
  );
}
