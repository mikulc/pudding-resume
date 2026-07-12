/**
 * ResumeCardPreview — 简历卡片实时预览组件
 *
 * 替代原有的 SVG 封面图方案，直接渲染完整的简历模板组件，
 * 通过 CSS transform: scale() 将 A4 尺寸缩放到卡片大小。
 *
 * 参考设计：
 * - 内部 div 固定 width: 210mm; height: 297mm（A4 原始尺寸）
 * - ResizeObserver 动态计算 scale = containerWidth / 793.7
 * - aspect-ratio: 210/297 保持卡片容器宽高比
 * - 底部渐变遮罩让预览自然过渡到信息栏
 */

import { useRef, useState, useLayoutEffect } from 'react';
import { ResumeCardPreviewProvider } from './ResumeCardPreviewProvider';
import { ResumePreview } from './PreviewComponents';
import { ResumePreviewSkeleton } from './ResumePreviewSkeleton';
import type { ResumeData, ThemeSettings } from '../../types/resume';

interface ResumeCardPreviewProps {
  content: ResumeData;
  theme?: ThemeSettings;
}

/** 单张简历卡片的缩放预览 */
export function ResumeCardPreview({ content, theme }: ResumeCardPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.24);

  // ResizeObserver 动态计算缩放比例
  // 使用 useLayoutEffect 在浏览器绘制前同步执行，消除初次渲染的缩放跳变（闪烁）
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 同步预测量，确保首帧就是正确的 scale，不等 observer 异步回调
    const rect = container.getBoundingClientRect();
    if (rect.width > 0) {
      setScale(rect.width / 793.700787);
    }

    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect || rect.width <= 0) return;
      // A4 纸宽 210mm = 793.700787px (96dpi)
      setScale(rect.width / 793.700787);
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // 内容为空时显示占位
  // 需检查所有可能的有效数据字段，避免"只有技能/简介/荣誉"的简历被误判为空
  const isEmpty =
    !content.personalInfo?.fullName &&
    !content.education?.length &&
    !content.workExperience?.length &&
    !content.projects?.length &&
    !content.skills?.trim() &&
    !content.summary?.trim() &&
    !content.honors?.length &&
    !content.certifications?.length &&
    !content.portfolio?.length &&
    !content.customSections?.some((cs) => cs.content?.trim());

  return (
    <ResumeCardPreviewProvider content={content} theme={theme} className="resume-card-preview-scope">
      <div
        ref={containerRef}
        className="resume-thumbnail-surface w-full h-full overflow-hidden bg-white text-left pointer-events-none"
      >
        {isEmpty ? (
          /* 空白简历：骨架直接填充卡片预览区，绕过 A4 缩放，铺满贴边 */
          <div className="absolute inset-0 flex items-stretch p-3 bg-white dark:bg-[#151b23]">
            <div className="w-full h-full rounded-2xl overflow-hidden">
              <ResumePreviewSkeleton variant="empty" className="w-full" />
            </div>
          </div>
        ) : (
          <div
            className="resume-card-preview-scale origin-top-left"
            style={{
              width: '210mm',
              minHeight: '297mm',
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              // 卡片模式下无分页，溢出内容用 overflow hidden 裁剪
              overflow: 'hidden',
            }}
          >
            <ResumePreview zoom={1} disablePagination />
          </div>
        )}
      </div>
    </ResumeCardPreviewProvider>
  );
}

/**
 * 卡片底部渐变遮罩容器
 *
 * 在卡片底部叠加一层从透明到白色的渐变，
 * 让被裁剪的预览内容平滑过渡到信息栏区域。
 */
export function CardGradientOverlay() {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 z-10"
      style={{
        height: '40%',
        background: 'linear-gradient(to top, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.7) 30%, transparent 100%)',
      }}
    />
  );
}
