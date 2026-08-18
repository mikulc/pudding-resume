import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RefreshCw, AlertCircle, HardDrive, Plus } from 'lucide-react';
import { NavbarAuth } from '../components/auth/NavbarAuth';
import LogoIcon from '../components/common/LogoIcon';
import { TopNavLinks } from '../components/common/TopNavLinks';
import { useAuth, isLocalStorageEnabled } from '../context/AuthContext';
import { ImportButton } from '../components/import/ImportButton';
import { CreateResumeModal } from '../components/resume/CreateResumeModal';
import { useResumeLibrary } from './my-resume/useResumeLibrary';
import { ResumeCard } from './my-resume/ResumeCard';
import { useResumeMenu } from './my-resume/useResumeMenu';
import { useResumeActions } from './my-resume/useResumeActions';
import { ResumeActionsMenu } from './my-resume/ResumeActionsMenu';
import { ResumeRenamePopover } from './my-resume/ResumeRenamePopover';
import { TemplatePagination } from '../components/template/TemplatePagination';

const RESUMES_PER_PAGE = 8;

export default function MyResumePage() {
  const navigate = useNavigate();
  const { isLoggedIn, sessionLoading } = useAuth();
  const { t } = useTranslation(['resume', 'common', 'homepage']);
  const showHintCard = !sessionLoading && !isLoggedIn && !isLocalStorageEnabled();
  const [currentPage, setCurrentPage] = useState(1);
  const {
    resumes, loading, totalResumeCount, error, scrollContainerRef,
    refreshList, removeResumeFromList, addResumeToList,
  } = useResumeLibrary(isLoggedIn, sessionLoading, currentPage, RESUMES_PER_PAGE);
  const totalPages = Math.ceil(totalResumeCount / RESUMES_PER_PAGE);

  const menu = useResumeMenu();
  const {
    menuOpenId, menuPos, renamePos, menuBtnRefs, menuRef, renamePopoverRef,
    renamingId, renameValue, setRenameValue, handleMenuToggle, handleMenuClose,
  } = menu;

  const actions = useResumeActions({
    resumes, refreshList, removeResumeFromList, addResumeToList, menu,
  });
  const {
    showCreateModal, setShowCreateModal, handleCardPreviewClick, handleDeleteClick,
    handleCopy, handleUploadToCloud, handleRenameStart, handleRenameCancel,
    handleRenameSubmit, handleNewResume, openSettings,
  } = actions;

  useEffect(() => {
    if (totalPages === 0 && currentPage !== 1) {
      setCurrentPage(1);
      return;
    }
    if (totalPages > 0 && currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const handlePageChange = (page: number) => {
    handleMenuClose();
    setCurrentPage(page);
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-gray-900 flex flex-col theme-color-transition">
      {/* ========== Header ========== */}
      <header className="fixed top-0 inset-x-0 z-50 bg-[var(--bg-header)] backdrop-blur-xl theme-color-transition">
        <div className="relative mx-auto flex h-[60px] w-full max-w-[1360px] items-center justify-between gap-3 px-3 sm:px-6 lg:w-[calc(100%-3rem)] xl:w-[calc(100%-5rem)]">
          <LogoIcon asBrand onClick={() => navigate('/')} />
          <div className="flex items-center gap-2">
            <NavbarAuth settingsShortcut={{ label: t('list.settings'), onClick: openSettings }} />
            <TopNavLinks />
          </div>
        </div>
      </header>

      {/* ========== Main Content ========== */}
      <main className="flex-1 flex min-h-0 flex-col pt-20 sm:pt-24">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-gray-400">
              <div className="w-8 h-8 border-2 border-gray-200 border-t-[#1e2836] rounded-full animate-spin" />
              <p className="text-sm">{t('list.loadingResumes')}</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 text-gray-500 max-w-md text-center">
              <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
                <AlertCircle className="w-7 h-7 text-red-400" />
              </div>
              <div>
                <p className="text-base font-semibold text-gray-700 mb-1">{t('list.loadFailed')}</p>
                <p className="text-sm text-gray-400">{error}</p>
              </div>
              <button
                onClick={() => { void refreshList(); }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors active:scale-[0.97]"
              >
                <RefreshCw className="w-4 h-4" />
                {t('list.reload')}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Top Toolbar: Title + Actions */}
            <div className="flex-shrink-0">
              {/* Local Storage Hint Card 鈥?only for non-logged-in users without local storage */}
              {showHintCard && (
                <div className="mx-auto w-full max-w-[1360px] px-4 sm:px-6 lg:w-[calc(100%-3rem)] xl:w-[calc(100%-5rem)]">
                  <div className="rounded-xl border border-orange-100 bg-gradient-to-r from-orange-50 to-amber-50/60 px-4 py-2.5 flex items-center gap-3">
                    <HardDrive className="w-4 h-4 text-orange-400 flex-shrink-0" />
                    <span className="flex-1 text-xs text-gray-600 truncate">{t('list.localStorageHint')}</span>
                    <button
                      onClick={() => navigate('/settings#storage')}
                      className="flex-shrink-0 px-3 py-1 rounded-lg border border-orange-300 text-orange-500 text-xs font-medium hover:bg-orange-50 transition-colors active:scale-[0.97] whitespace-nowrap"
                    >
                      {t('list.goConfig')}
                    </button>
                  </div>
                </div>
              )}
              <div className="mx-auto w-full max-w-[1360px] px-4 sm:px-6 lg:w-[calc(100%-3rem)] xl:w-[calc(100%-5rem)]">
                <div
                  className={`mb-7 flex w-full flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between ${showHintCard ? 'mt-4' : ''}`}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <h1 className="whitespace-nowrap text-[28px] font-semibold tracking-tight text-[#111827] dark:text-slate-50 sm:text-[32px]">
                      {t('list.allResumes')}
                    </h1>
                    <span className="inline-flex h-6 flex-shrink-0 items-center rounded-full bg-[var(--theme-accent)] px-[9px] text-xs font-semibold text-[var(--theme-accent-foreground)]">
                      {t('list.resumeCount', { count: totalResumeCount })}
                    </span>
                  </div>
                  <div className="flex w-full flex-shrink-0 items-center gap-2 sm:w-auto">
                    <button
                      type="button"
                      onClick={handleNewResume}
                      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[var(--theme-accent)] bg-[var(--theme-accent)] px-4 text-sm font-medium text-[var(--theme-accent-foreground)] transition-opacity hover:opacity-90 active:scale-[0.98] sm:w-auto"
                    >
                      <Plus className="h-4 w-4" />
                      <span>{t('list.newResume')}</span>
                    </button>
                    <ImportButton onImportComplete={refreshList} />
                  </div>
                </div>
              </div>
            </div>

            {/* Resume Grid */}
            <div
              ref={scrollContainerRef}
              className="-mt-1 flex-1 overflow-y-auto pt-1"
            >
              <div className="mx-auto w-full max-w-[1360px] px-4 pb-6 sm:px-6 lg:w-[calc(100%-3rem)] xl:w-[calc(100%-5rem)]" data-global-toolbar-content>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-6">
                  {resumes.map((resume) => (
                    <ResumeCard
                      key={resume.id}
                      resume={resume}
                      isMenuOpen={menuOpenId === resume.id}
                      isRenaming={renamingId === resume.id}
                      menuBtnRefs={menuBtnRefs}
                      onPreview={handleCardPreviewClick}
                      onMenuToggle={handleMenuToggle}
                    />
                  ))}
                </div>
                {totalPages > 1 && (
                  <div className="mt-7 pb-4 sm:mt-8">
                    <TemplatePagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={handlePageChange}
                      previousLabel={t('list.pagination.previous')}
                      nextLabel={t('list.pagination.next')}
                      jumpLabel={t('list.pagination.label')}
                      pageLabel={(page) => t('list.pagination.pageAria', { page })}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <ResumeActionsMenu
        menuOpenId={menuOpenId}
        menuPos={menuPos}
        menuRef={menuRef}
        resumes={resumes}
        onClose={handleMenuClose}
        onCopy={handleCopy}
        onRename={handleRenameStart}
        onUpload={handleUploadToCloud}
        onDelete={handleDeleteClick}
      />

      <ResumeRenamePopover
        open={renamingId !== null}
        position={renamePos}
        popoverRef={renamePopoverRef}
        value={renameValue}
        onChange={setRenameValue}
        onSubmit={handleRenameSubmit}
        onCancel={handleRenameCancel}
      />

      {/* ========== Create Resume Modal ========== */}
      <CreateResumeModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

    </div>
  );
}
