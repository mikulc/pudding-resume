import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import styles from './TemplatePagination.module.css';

interface TemplatePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  previousLabel: string;
  nextLabel: string;
  jumpLabel: string;
  pageLabel: (page: number) => string;
}

const MIDDLE_PAGE_COUNT = 3;

export function TemplatePagination({
  currentPage,
  totalPages,
  onPageChange,
  previousLabel,
  nextLabel,
  jumpLabel,
  pageLabel,
}: TemplatePaginationProps) {
  const [jumpPage, setJumpPage] = useState('');

  const middlePages = useMemo(() => {
    if (totalPages <= 2) return [];

    let start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, start + MIDDLE_PAGE_COUNT - 1);
    start = Math.max(2, end - MIDDLE_PAGE_COUNT + 1);

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [currentPage, totalPages]);

  if (totalPages <= 1) return null;

  const changePage = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    onPageChange(page);
  };

  const submitJump = () => {
    const page = Number.parseInt(jumpPage, 10);
    if (Number.isFinite(page)) changePage(page);
    setJumpPage('');
  };

  const renderPage = (page: number) => (
    <button
      key={page}
      type="button"
      className={`${styles.page} ${page === currentPage ? styles.current : ''}`}
      onClick={() => changePage(page)}
      aria-label={pageLabel(page)}
      aria-current={page === currentPage ? 'page' : undefined}
    >
      {page}
    </button>
  );

  return (
    <nav className={styles.navigation} aria-label={jumpLabel}>
      {currentPage > 1 && (
        <button
          type="button"
          className={`${styles.control} ${styles.previous}`}
          onClick={() => changePage(currentPage - 1)}
          aria-label={previousLabel}
        >
          <ChevronLeft size={17} aria-hidden="true" />
          <span className={styles.controlLabel}>{previousLabel}</span>
        </button>
      )}

      <div className={styles.pages}>
        {renderPage(1)}
        {middlePages[0] > 2 && <span className={styles.ellipsis}>…</span>}
        {middlePages.map(renderPage)}
        {middlePages[middlePages.length - 1] < totalPages - 1 && (
          <span className={styles.ellipsis}>…</span>
        )}
        {renderPage(totalPages)}

        <div className={styles.jump}>
          <span className={styles.jumpPreview} aria-hidden="true">
            <ChevronsRight size={17} />
          </span>
          <input
            className={styles.jumpInput}
            type="text"
            inputMode="numeric"
            maxLength={3}
            value={jumpPage}
            onChange={(event) => setJumpPage(event.target.value.replace(/\D/g, ''))}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submitJump();
            }}
            aria-label={jumpLabel}
          />
          <button
            type="button"
            className={styles.jumpButton}
            onClick={submitJump}
            aria-label={jumpLabel}
          >
            <ChevronsRight size={15} aria-hidden="true" />
          </button>
        </div>
      </div>

      {currentPage < totalPages && (
        <button
          type="button"
          className={`${styles.control} ${styles.next}`}
          onClick={() => changePage(currentPage + 1)}
          aria-label={nextLabel}
        >
          <span className={styles.controlLabel}>{nextLabel}</span>
          <ChevronRight size={17} aria-hidden="true" />
        </button>
      )}
    </nav>
  );
}
