import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RefreshCw, AlertCircle, HardDrive, Plus } from 'lucide-react';
import { NavbarAuth } from '../components/auth/NavbarAuth';
import LogoIcon from '../components/common/LogoIcon';
import { TopNavLinks } from '../components/common/TopNavLinks';
import { useAuth, isLocalStorageEnabled } from '../context/AuthContext';
import { ImportButton } from '../components/import/ImportButton';
import { CreateResumeModal } from '../components/resume/CreateResumeModal';
import { ResumePreviewSkeleton } from '../components/preview/ResumePreviewSkeleton';
import { useResumeLibrary } from './my-resume/useResumeLibrary';
import { ResumeCard } from './my-resume/ResumeCard';
import { useResumeMenu } from './my-resume/useResumeMenu';
import { useResumeActions } from './my-resume/useResumeActions';
import { ResumeActionsMenu } from './my-resume/ResumeActionsMenu';


export default function MyResumePage() {
  const navigate = useNavigate();
  const { isLoggedIn, sessionLoading } = useAuth();
  const { t } = useTranslation(['resume', 'common', 'homepage']);
  const showHintCard = !sessionLoading && !isLoggedIn && !isLocalStorageEnabled();
  const {
    resumes, loading, loadingMore, hasMore, totalResumeCount, error,
    scrollContainerRef, loadMoreTriggerRef, handleResumeListScroll,
    handleResumeListWheel, refreshList,
  } = useResumeLibrary(isLoggedIn, sessionLoading);

  const menu = useResumeMenu();
  const {
    menuOpenId, menuPos, menuBtnRefs, menuRef, renamePopoverRef,
    renamingId, renameValue, setRenameValue, handleMenuToggle, handleMenuClose,
  } = menu;

  const actions = useResumeActions({ resumes, refreshList, menu });
  const {
    showCreateModal, setShowCreateModal, handleCardPreviewClick, handleDeleteClick,
    handleCopy, handleUploadToCloud, handleRenameStart, handleRenameCancel,
    handleRenameSubmit, handleNewResume, openSettings,
  } = actions;

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-gray-900 flex flex-col theme-color-transition">
      {/* ========== Header ========== */}
      <header className="fixed top-0 inset-x-0 z-50 bg-[var(--bg-header)] backdrop-blur-xl border-b border-gray-100 theme-color-transition">
        <div className="relative mx-auto flex h-14 w-full max-w-[1360px] items-center justify-between gap-3 px-3 sm:h-[60px] sm:px-6 lg:w-[calc(100%-3rem)] xl:w-[calc(100%-5rem)]">
          <LogoIcon asBrand onClick={() => navigate('/')} />
          <div className="flex items-center gap-2">
            <NavbarAuth settingsShortcut={{ label: t('list.settings'), onClick: openSettings }} />
            <TopNavLinks />
          </div>
        </div>
      </header>

      {/* ========== Main Content ========== */}
      <main className="flex-1 flex flex-col pt-14 sm:pt-[60px] min-h-0">
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
                <div className="mx-auto w-full max-w-[1360px] px-6 pt-5 lg:w-[calc(100%-3rem)] xl:w-[calc(100%-5rem)]">
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
              <div
                className={`mx-auto flex w-full max-w-[1360px] flex-col gap-4 px-6 sm:flex-row sm:items-center sm:justify-between sm:gap-6 lg:w-[calc(100%-3rem)] xl:w-[calc(100%-5rem)] ${showHintCard ? 'pt-4' : 'pt-8'}`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-[28px] font-bold leading-[1.2] tracking-[-0.02em] text-gray-900">
                      {t('list.myResumes')}
                    </h1>
                    <span className="inline-flex h-6 flex-shrink-0 items-center rounded-full bg-slate-100 px-[9px] text-xs font-semibold text-[#3f5f8a]">
                      {t('list.resumeCount', { count: totalResumeCount })}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm leading-[1.5] text-[#667085]">
                    {t('list.pageDescription')}
                  </p>
                </div>
                <div className="w-full flex-shrink-0 sm:w-auto">
                  <ImportButton onImportComplete={refreshList} />
                </div>
              </div>
            </div>

            {/* Resume Grid */}
            <div
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto"
              onScroll={handleResumeListScroll}
              onWheel={handleResumeListWheel}
            >
              <div className="mx-auto w-full max-w-[1360px] px-6 pb-6 pt-6 lg:w-[calc(100%-3rem)] xl:w-[calc(100%-5rem)]" data-global-toolbar-content>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-6">
                  {/* New Resume Card 鈥?always shown */}
                  <button
                    type="button"
                    onClick={handleNewResume}
                    className="theme-color-transition new-resume-card resume-blank-card relative w-full text-left rounded-[22px] border border-dashed border-slate-200/80 cursor-pointer flex flex-col overflow-hidden group"
                  >
                    <div className="pointer-events-none invisible w-full" aria-hidden="true">
                      <div className="aspect-[4/5] w-full" />
                      <div className="resume-grid-card-footer-spacer" />
                    </div>
                    <div className="theme-color-transition new-resume-card-surface absolute inset-0">
                      <div className="absolute inset-x-4 top-4 bottom-4">
                        <ResumePreviewSkeleton variant="create" />
                      </div>

                      <div className="new-resume-card-cta absolute inset-0 flex items-center justify-center">
                        <div className="new-resume-card-cta-content theme-color-transition flex flex-col items-center gap-4 text-gray-400">
                          <div className="theme-color-transition new-resume-plus-box w-16 h-16 rounded-[20px] flex items-center justify-center">
                            <Plus className="w-8 h-8" />
                          </div>
                          <div className="text-center">
                            <p className="resume-card-title theme-color-transition text-base font-semibold text-gray-500">
                              {t('list.newResume')}
                            </p>
                            <p className="theme-color-transition text-xs text-gray-400 mt-1">
                              {t('list.newResumeDesc')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>

                  {resumes.map((resume) => (
                    <ResumeCard
                      key={resume.id}
                      resume={resume}
                      isMenuOpen={menuOpenId === resume.id}
                      isRenaming={renamingId === resume.id}
                      scrollContainerRef={scrollContainerRef}
                      menuBtnRefs={menuBtnRefs}
                      renamePopoverRef={renamePopoverRef}
                      renameValue={renameValue}
                      setRenameValue={setRenameValue}
                      onPreview={handleCardPreviewClick}
                      onMenuToggle={handleMenuToggle}
                      onRenameSubmit={handleRenameSubmit}
                      onRenameCancel={handleRenameCancel}
                    />
                  ))}
                  {(hasMore || loadingMore) && (
                    <div
                      ref={loadMoreTriggerRef}
                      className="col-span-full flex h-10 items-center justify-center"
                      aria-live="polite"
                    >
                      {loadingMore && (
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <div className="h-4 w-4 rounded-full border-2 border-slate-200 border-t-slate-400 animate-spin" />
                          <span>{t('list.loadingResumes')}</span>
                        </div>
                      )}
                    </div>
                  )}
                  </div>
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

      {/* ========== Create Resume Modal ========== */}
      <CreateResumeModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

    </div>
  );
}
