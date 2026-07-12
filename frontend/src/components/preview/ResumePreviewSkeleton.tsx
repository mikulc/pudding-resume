/**
 * ResumePreviewSkeleton — 简历预览骨架占位组件
 *
 * 左侧"新建简历"卡片和右侧空白简历卡片共用的骨架样式。
 *
 * @param variant  "create" — 用于新建简历卡片，自带 new-resume-paper-preview 纸面容器
 *                 "empty"  — 用于空白简历卡片，仅渲染骨架内容，外层由父组件控制
 */

const skeletonSections = [
  { titleWidth: 'w-[24%]', lineWidths: ['w-full', 'w-[88%]', 'w-[72%]'] },
  { titleWidth: 'w-[30%]', lineWidths: ['w-full', 'w-[84%]'] },
  { titleWidth: 'w-[28%]', lineWidths: ['w-[92%]', 'w-[70%]'] },
  { titleWidth: 'w-[24%]', lineWidths: ['w-full', 'w-[78%]'] },
  { titleWidth: 'w-[22%]', lineWidths: ['w-[86%]'] },
];

interface ResumePreviewSkeletonProps {
  /** 变体：create 自带纸面容器，empty 仅内容 */
  variant?: 'create' | 'empty';
  className?: string;
}

function SkeletonContent({ className }: { className?: string }) {
  return (
    <div className={className} data-resume-skeleton>
      {/* Header: title + meta lines + avatar placeholder */}
      <div className="new-resume-paper-header">
        <div className="min-w-0 flex-1">
          <div className="new-resume-skeleton-line title w-[46%]" />
          <div className="mt-3 flex flex-wrap gap-2">
            <div className="new-resume-skeleton-line meta w-[28%]" />
            <div className="new-resume-skeleton-line meta w-[34%]" />
            <div className="new-resume-skeleton-line meta w-[24%]" />
          </div>
        </div>
        <div className="new-resume-skeleton-avatar" />
      </div>

      {/* Body: section heading + content lines */}
      <div className="new-resume-paper-body">
        {skeletonSections.map((section, i) => (
          <div key={i} className="new-resume-skeleton-section">
            <div className={`new-resume-skeleton-line heading ${section.titleWidth}`} />
            <div className="space-y-2">
              {section.lineWidths.map((lineWidth) => (
                <div key={lineWidth} className={`new-resume-skeleton-line body ${lineWidth}`} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ResumePreviewSkeleton({ variant = 'empty', className }: ResumePreviewSkeletonProps) {
  if (variant === 'create') {
    return (
      <div className="new-resume-paper-preview rounded-2xl overflow-hidden h-full w-full" aria-hidden="true">
        <SkeletonContent className={className} />
      </div>
    );
  }

  // variant === "empty": 仅渲染骨架内容，外层由父组件控制尺寸和定位
  return <SkeletonContent className={className} />;
}
