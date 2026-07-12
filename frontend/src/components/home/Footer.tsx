import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Github, Mail, Twitter } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import LogoIcon from '../common/LogoIcon';
import { DEFAULT_LOCALE, getLocaleFromPath, getDefaultLocalePath } from '../../utils/localePath';
import { beian, socialLinks as configuredSocialLinks } from '../../config/siteSettings';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FooterLink {
  label: string;
  href: string;
}

type SocialLink = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

export default function Footer() {
  const { t } = useTranslation('homepage');
  const navigate = useNavigate();
  const location = useLocation();
  const currentLocale = getLocaleFromPath(location.pathname) || DEFAULT_LOCALE;

  // -----------------------------------------------------------------------
  // i18n link groups
  // -----------------------------------------------------------------------

  const productLinks: FooterLink[] = useMemo(
    () => [
      { label: t('footer.product.start'), href: '/resumes' },
      { label: t('footer.product.templates'), href: '/templates' },
      { label: t('footer.product.settings'), href: '/settings' },
    ],
    [t],
  );

  const supportLinks: FooterLink[] = useMemo(
    () => [
      { label: t('footer.support.about'), href: '/about' },
      { label: t('footer.support.changelog'), href: '/update' },
    ],
    [t],
  );

  // -----------------------------------------------------------------------
  // Social links & beian
  // -----------------------------------------------------------------------

  // Map platform to icon; only render links with a non-empty URL
  const socialLinks: SocialLink[] = useMemo(() => {
    const GITEE_ICON = (
      <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.984 0C5.38 0 0 5.38 0 11.984c0 5.292 3.422 9.77 8.15 11.364.594.117.81-.26.81-.577 0-.285-.01-1.038-.016-2.04-3.308.72-4.004-1.594-4.004-1.594-.54-1.374-1.32-1.74-1.32-1.74-1.08-.74.08-.724.08-.724 1.194.084 1.823 1.226 1.823 1.226 1.06 1.818 2.783 1.293 3.462.99.107-.77.415-1.294.754-1.59-2.64-.3-5.415-1.32-5.415-5.88 0-1.298.464-2.36 1.224-3.19-.122-.3-.53-1.51.117-3.145 0 0 .995-.318 3.26 1.22a11.355 11.355 0 0 1 2.968-.4c1.008.005 2.025.137 2.97.4 2.26-1.537 3.254-1.22 3.254-1.22.648 1.636.24 2.845.12 3.145.762.83 1.223 1.892 1.223 3.19 0 4.572-2.78 5.578-5.427 5.872.427.37.808 1.095.808 2.208 0 1.594-.015 2.88-.015 3.27 0 .32.213.7.816.577A11.997 11.997 0 0 0 24 11.984C24 5.38 18.62 0 11.984 0z" />
      </svg>
    );

    const QQ_ICON = (
      <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor">
        <path d="M21.395 15.035a39.518 39.518 0 0 0-.803-2.264l-1.079-2.695c.001-.032.014-.562.014-.836C19.526 4.632 17.351 0 12 0S4.474 4.632 4.474 9.241c0 .274.013.804.014.836L3.409 12.77a39.518 39.518 0 0 0-.803 2.264c-.518 1.517-.828 2.636-.829 2.636-.096.297-.15.614-.15.951 0 1.368 1.174 2.379 2.582 2.379.354 0 .693-.067 1.005-.188.022.158.055.311.099.457.502 1.652 2.438 3.731 6.687 3.731s6.185-2.079 6.687-3.731c.044-.146.077-.299.099-.457.312.121.651.188 1.005.188 1.408 0 2.582-1.011 2.582-2.379 0-.337-.054-.654-.15-.951 0 0-.311-1.119-.829-2.636zM12 14.4c-2.52 0-4.306-1.632-4.306-3.385 0-1.507.912-2.614 2.207-3.139-.426-.319-.829-.795-.955-1.373-.201-.926.287-1.831 1.302-2.416.219-.126.479-.083.615.101.049.068.071.15.062.232-.045.41.141.803.391 1.088.482-.377 1.162-.566 1.899-.566s1.417.189 1.899.566c.25-.285.436-.678.391-1.088-.009-.082.013-.164.062-.232.136-.184.396-.226.615-.101 1.015.585 1.503 1.49 1.302 2.416-.127.579-.53 1.055-.955 1.373 1.296.525 2.207 1.632 2.207 3.139 0 1.753-1.786 3.385-4.306 3.385z" />
      </svg>
    );

    const ICON_MAP: Record<string, React.ReactNode> = {
      github: <Github className="h-[18px] w-[18px]" />,
      email: <Mail className="h-[18px] w-[18px]" />,
      x: <Twitter className="h-[18px] w-[18px]" />,
      gitee: GITEE_ICON,
      qq: QQ_ICON,
    };

    return configuredSocialLinks
      .filter(link => link.url)
      .map(link => ({
        label: link.name,
        href: link.url,
        icon: ICON_MAP[link.platform] ?? null,
      }))
      .filter(item => item.icon !== null);
  }, []);

  const icpLicense = beian.icp_number || '';
  const securityRecord = beian.police_number || '';
  const copyrightText = beian.copyright || t('footer.copyright');

  // -----------------------------------------------------------------------
  // Route / anchor helpers
  // -----------------------------------------------------------------------

  const handleBrandClick = () => {
    navigate(getDefaultLocalePath(currentLocale));
  };

  const isInternalHash = (href: string) => href.startsWith('/#');
  const isInternalRoute = (href: string) => href.startsWith('/') && !href.startsWith('/#');
  const isExternal = (href: string) => /^https?:\/\//.test(href) || /^mailto:/.test(href);
  const footerLinkClassName = 'footer-link';

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <footer
      className="footer-root relative transition-colors duration-300"
      role="contentinfo"
    >
      <div className="relative px-4 sm:px-8 lg:px-12">
        {/* ---- Footer main content ---- */}
        <div className="mx-auto grid max-w-[1360px] gap-10 pt-10 pb-8 sm:gap-12 sm:pb-10 md:grid-cols-12 lg:gap-16 lg:pb-8">
          {/* Brand */}
          <div className="md:col-span-5">
            <button
              type="button"
              onClick={handleBrandClick}
              aria-label={t('brand.fullName')}
              className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-500 rounded-md"
            >
              <LogoIcon className="h-9 w-auto flex-shrink-0" />
              <span className="text-lg font-bold tracking-normal text-gray-800 dark:text-slate-200">
                {t('brand.fullName')}
              </span>
            </button>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-gray-500 dark:text-slate-400">
              {t('footer.description')}
            </p>
          </div>

          {/* Links */}
          <div className="grid grid-cols-2 gap-10 md:col-span-4 md:gap-8 lg:gap-12">
            {/* Product */}
            <div>
              <p className="mb-4 text-sm font-bold uppercase tracking-[0.16em] text-[rgb(100,100,106)] dark:text-[rgb(100,100,106)]">
                {t('footer.productTitle')}
              </p>
              <ul className="space-y-3">
                {productLinks.map(link => (
                  <li key={link.label}>
                    {isInternalHash(link.href) ? (
                      <a
                        href={link.href}
                        className={footerLinkClassName}
                      >
                        {link.label}
                      </a>
                    ) : isInternalRoute(link.href) ? (
                      <button
                        type="button"
                        onClick={() => navigate(link.href)}
                        className={footerLinkClassName}
                      >
                        {link.label}
                      </button>
                    ) : (
                      <a
                        href={link.href}
                        target={isExternal(link.href) ? '_blank' : undefined}
                        rel={isExternal(link.href) ? 'noreferrer' : undefined}
                        className={footerLinkClassName}
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Support */}
            <div>
              <p className="mb-4 text-sm font-bold uppercase tracking-[0.16em] text-[rgb(100,100,106)] dark:text-[rgb(100,100,106)]">
                {t('footer.supportTitle')}
              </p>
              <ul className="space-y-3">
                {supportLinks.map(link => (
                  <li key={link.label}>
                    {isInternalRoute(link.href) ? (
                      <button
                        type="button"
                        onClick={() => navigate(link.href)}
                        className={footerLinkClassName}
                      >
                        {link.label}
                      </button>
                    ) : (
                      <a
                        href={link.href}
                        target={isExternal(link.href) ? '_blank' : undefined}
                        rel={isExternal(link.href) ? 'noreferrer' : undefined}
                        className={footerLinkClassName}
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Social */}
          <div className="md:col-span-3">
            <p className="mb-4 text-sm font-bold uppercase tracking-[0.16em] text-[rgb(100,100,106)] dark:text-[rgb(100,100,106)]">
              {t('footer.socialTitle')}
            </p>
            <div className="flex items-center gap-3">
              {socialLinks.map(social => (
                <a
                  key={social.label}
                  href={social.href}
                  target={isExternal(social.href) ? '_blank' : undefined}
                  rel={isExternal(social.href) ? 'noreferrer' : undefined}
                  aria-label={social.label}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full
                             border border-gray-200 bg-white text-gray-500
                             hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600
                             dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400
                             dark:hover:border-[#fbbf24]/40 dark:hover:bg-[#fbbf24] dark:hover:text-[#17191d]
                             transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* ---- Bottom bar: copyright & records ---- */}
        <div className="mx-auto flex max-w-[1360px] flex-wrap items-center justify-between gap-3 border-t border-[rgba(15,23,42,0.06)] py-5 dark:border-[rgba(148,163,184,0.12)] sm:py-6">
          <p className="text-xs text-gray-400 dark:text-slate-500">
            {copyrightText}
          </p>

          {(icpLicense || securityRecord) && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400 dark:text-slate-500">
              {icpLicense && (
                <span>{t('footer.icp', { icp: icpLicense })}</span>
              )}
              {securityRecord && (
                <span>{t('footer.securityRecord', { record: securityRecord })}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
