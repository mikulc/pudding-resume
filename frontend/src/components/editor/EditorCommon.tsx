import { useAccentStyle } from './StyledInputs';

/**
 * 编辑器区块底部的"添加条目"按钮。
 * 统一了 Education / Work / Project / Honor / Certification / Portfolio 等编辑器的添加按钮样式。
 */
export function AddEntryButton({ onClick, label }: { onClick: () => void; label: string }) {
  const accent = useAccentStyle();
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-[22px] border border-dashed border-gray-300 text-gray-400 ${accent.className.addHover} transition-all text-xs`}
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
      {label}
    </button>
  );
}

/**
 * 编辑器条目卡片头部：序号 + 删除按钮。
 * 统一了 Education / Work / Project / Honor / Certification / Portfolio 等条目的卡片头部。
 */
export function EntryCardHeader({ index, onDelete }: { index: number; onDelete: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-400"># {index + 1}</span>
      <button
        onClick={onDelete}
        className="text-gray-400 hover:text-red-500 transition-colors p-1"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}
