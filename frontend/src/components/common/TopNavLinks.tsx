import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FileText, LayoutTemplate, Settings } from 'lucide-react';

const navItems = [
  { path: '/resumes', labelKey: 'resume:list.myResumes', icon: FileText },
  { path: '/templates', labelKey: 'homepage:footer.product.templates', icon: LayoutTemplate },
  { path: '/settings', labelKey: 'resume:list.settings', icon: Settings },
];

export function TopNavLinks() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { t } = useTranslation(['resume', 'homepage']);

  return (
    <nav className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-2 md:flex">
      {navItems.map((item) => {
        const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`);

        return (
          <button
            key={item.path}
            type="button"
            onClick={() => navigate(item.path)}
            aria-current={isActive ? 'page' : undefined}
            className={`inline-flex h-9 items-center justify-center rounded-full px-4 text-base font-bold tracking-normal transition-colors duration-150 ${
              isActive
                ? 'bg-[var(--theme-accent)] text-[var(--theme-accent-foreground)]'
                : 'text-gray-800 hover:!bg-[var(--theme-accent)] hover:!text-[var(--theme-accent-foreground)] dark:text-slate-200'
            }`}
          >
            {t(item.labelKey)}
          </button>
        );
      })}

    </nav>
  );
}
