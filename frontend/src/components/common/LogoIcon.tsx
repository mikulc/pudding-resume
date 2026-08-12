import React from 'react';
import { useTranslation } from 'react-i18next';
import logo from '../../assets/logo.svg';

interface LogoIconProps {
  className?: string;
  asBrand?: boolean;
  onClick?: () => void;
}

const getLogoClassName = (className?: string) => `${className ?? ''} select-none`;

const LogoIcon: React.FC<LogoIconProps> = ({ className, asBrand = false, onClick }) => {
  const { t } = useTranslation(['homepage', 'common']);
  const fullName = t('homepage:brand.fullName');
  const shortName = t('homepage:brand.shortName');
  const backHome = t('common:button.backHome');

  const image = (
    <img
      src={logo}
      alt="Logo"
      className={getLogoClassName(className)}
      draggable={false}
      onDragStart={(event) => event.preventDefault()}
    />
  );

  if (!asBrand) {
    return image;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={backHome}
      className="relative inline-flex h-9 min-w-0 max-w-[45vw] items-center justify-start gap-2 text-[18px] font-bold tracking-normal text-gray-800 dark:text-slate-200 sm:max-w-none"
    >
      <img
        src={logo}
        alt=""
        aria-hidden="true"
        className="h-9 w-9 shrink-0 select-none"
        draggable={false}
        onDragStart={(event) => event.preventDefault()}
      />
      <span className="min-w-0 truncate whitespace-nowrap sm:hidden">{shortName}</span>
      <span className="hidden min-w-0 truncate whitespace-nowrap sm:inline">{fullName}</span>
    </button>
  );
};

export default LogoIcon;
