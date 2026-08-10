const RELEVANT_CSS_PROPS = [
  // 文字样式
  'color',
  'font-size',
  'font-weight',
  'font-style',
  'font-family',
  'letter-spacing',
  'text-decoration',
  'text-transform',
  'text-align',
  'text-indent',
  'text-overflow',
  'vertical-align',
  'line-height',
  'white-space',
  'word-break',
  'overflow-wrap',
  'word-wrap',

  // 背景
  'background-color',
  'background-image',
  'background-size',
  'background-position',
  'background-repeat',

  // 布局
  'display',
  'flex-direction',
  'flex-wrap',
  'flex-grow',
  'flex-shrink',
  'flex-basis',
  'align-items',
  'align-content',
  'align-self',
  'justify-content',
  'justify-items',
  'justify-self',
  'gap',
  'row-gap',
  'column-gap',
  'order',
  'grid-template-columns',
  'grid-template-rows',
  'grid-column',
  'grid-row',

  // 盒模型
  'width',
  'max-width',
  'min-width',
  'height',
  'max-height',
  'min-height',
  'margin',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'padding',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'box-sizing',

  // 边框
  'border',
  'border-top',
  'border-right',
  'border-bottom',
  'border-left',
  'border-width',
  'border-style',
  'border-color',
  'border-radius',
  'border-top-left-radius',
  'border-top-right-radius',
  'border-bottom-left-radius',
  'border-bottom-right-radius',

  // 定位
  'position',
  'top',
  'right',
  'bottom',
  'left',
  'z-index',

  // 视觉效果
  'opacity',
  'visibility',
  'overflow',
  'overflow-x',
  'overflow-y',
  'transform',
  'transform-origin',
  'box-shadow',

  // 缩放（前端预览通过 zoom 控制字体缩放层级）
  'zoom',

  // 表格
  'border-collapse',
  'border-spacing',
  'table-layout',
];

// 需要跳过的元素标签（不会渲染在 PDF 中的）
// 需要跳过内联样式的属性名（这些是前端编辑交互用的）
const SKIP_STYLE_PROPS = new Set([
  'cursor',
  'pointer-events',
  'user-select',
  'outline',
  'outline-color',
  'outline-style',
  'outline-width',
  'transition',
  'transition-delay',
  'transition-duration',
  'transition-property',
  'transition-timing-function',
  'animation',
  'animation-delay',
  'animation-direction',
  'animation-duration',
  'animation-fill-mode',
  'animation-iteration-count',
  'animation-name',
  'animation-play-state',
  'animation-timing-function',
  'will-change',
  'scroll-behavior',
]);

/**
 * 将元素的 computed styles 中相关属性内联为 style 属性
 */
function inlineComputedStyle(cloneEl: HTMLElement, origEl: HTMLElement): void {
  const computed = window.getComputedStyle(origEl);
  const styles: string[] = [];
  const inlineCustomProperties = Array.from(origEl.style)
    .filter((property) => property.startsWith('--'))
    .map((property) => ({
      property,
      value: origEl.style.getPropertyValue(property),
      priority: origEl.style.getPropertyPriority(property),
    }));

  for (const prop of RELEVANT_CSS_PROPS) {
    if (SKIP_STYLE_PROPS.has(prop)) continue;
    const val = computed.getPropertyValue(prop);
    // 跳过默认值和空值
    // Skip truly default values. Note: we intentionally do NOT skip "auto"
    // because it is a meaningful value for properties like overflow, margin,
    // flex-basis, etc. Only skip "initial", "none", "normal" which are true
    // computed defaults for non-layout-critical properties.
    if (!val || val === 'initial' || val === 'none' || val === 'normal') {
      continue;
    }
    // Use !important to ensure inline styles beat any !important class rules
    // from layout CSS (e.g., elegant layout's "background-color: transparent !important"
    // would otherwise override our computed background color due to cascade rules:
    // Author !important > Author normal, regardless of specificity)
    styles.push(`${prop}: ${val} !important`);
  }

  if (styles.length > 0) {
    cloneEl.setAttribute('style', styles.join('; '));
  }

  // Layout decorations and pagination geometry depend on inline CSS
  // variables such as --resume-page-margin and --personal-photo-height.
  // Reapply them after replacing the style attribute with computed values.
  for (const { property, value, priority } of inlineCustomProperties) {
    cloneEl.style.setProperty(property, value, priority);
  }
}

/**
 * 将 <img> 标签的 src 转为 base64 data URL
 * 跳过已经是 data: URL 的、SVG 内联的、以及无法加载的图片
 */
export async function convertImagesToBase64(root: HTMLElement): Promise<void> {
  const images = root.querySelectorAll('img');
  const promises: Promise<void>[] = [];

  images.forEach((img) => {
    const src = img.getAttribute('src');
    if (!src || src.startsWith('data:')) return;

    promises.push(
      new Promise<void>((resolve) => {
        // 尝试加载图片并转为 base64
        const canvas = document.createElement('canvas');
        const tempImg = new Image();
        tempImg.crossOrigin = 'anonymous';

        tempImg.onload = () => {
          try {
            canvas.width = tempImg.naturalWidth;
            canvas.height = tempImg.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(tempImg, 0, 0);
              const dataUrl = canvas.toDataURL('image/png');
              img.setAttribute('src', dataUrl);
            }
          } catch {
            // Canvas 污染或转换失败，保留原始 src
          }
          resolve();
        };

        tempImg.onerror = () => {
          // 无法加载，保留原始 src（Chrome 可能仍可访问）
          resolve();
        };

        tempImg.src = src;
      }),
    );
  });

  await Promise.all(promises);
}

/**
 * 移除 AI 诊断标记：将 .diagnosis-mark 元素替换为其内部内容，保留文字但去除视觉标记
 */
export function removeDiagnosisMarks(root: HTMLElement): void {
  const marks = root.querySelectorAll<HTMLElement>('.diagnosis-mark');
  // 使用 Array.from 创建静态快照，避免在遍历中修改 DOM 导致问题
  const markArray = Array.from(marks);
  for (const mark of markArray) {
    const parent = mark.parentNode;
    if (!parent) continue;
    // 将 .diagnosis-mark 的子节点移动到其父节点中（替换自身）
    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark);
    }
    parent.removeChild(mark);
  }
}

export function removeExportExcluded(root: HTMLElement): void {
  root.querySelectorAll('[data-export-exclude]').forEach((el) => el.remove());
}

/**
 * 移除交互相关的 HTML 属性
 */
export function removeInteractiveAttributes(root: HTMLElement): void {
  const allElements = root.querySelectorAll('*');
  const attrNames = [
    'contenteditable',
    'data-section',      // 前端分页标记，PDF 不需要
    'data-section-header',
    'data-entry-index',
    'data-field',
    'data-entry-id',
    'tabindex',
    'draggable',
  ];

  // 处理根元素
  for (const attr of attrNames) {
    root.removeAttribute(attr);
  }

  // 处理所有子元素
  allElements.forEach((el) => {
    for (const attr of attrNames) {
      el.removeAttribute(attr);
    }
    // 移除所有以 data-v- 开头的属性（Vue/preact 无用）
    Array.from(el.attributes).forEach((a) => {
      if (a.name.startsWith('data-v-') || a.name === 'aria-hidden') {
        el.removeAttribute(a.name);
      }
    });
  });
}

/**
 * 将元素和其所有子元素的 computed style 内联
 */
export function inlineAllStyles(root: HTMLElement): void {
  // 需要一个原始 DOM 引用以便获取 computed styles
  // 使用 document.querySelector 找到对应元素
  const allElements = root.querySelectorAll('*');
  const rootId = '__export_root__';

  // 给根元素打标记
  const originalRoot = document.getElementById(rootId);
  if (!originalRoot) return;

  // 内联根元素
  inlineComputedStyle(root, originalRoot);

  // 内联所有子元素
  const origElements = originalRoot.querySelectorAll('*');
  allElements.forEach((cloneEl, i) => {
    if (i < origElements.length && cloneEl instanceof HTMLElement) {
      inlineComputedStyle(cloneEl as HTMLElement, origElements[i] as HTMLElement);
    }
  });
}

/**
 * 处理单个 DOM 元素：深克隆 → 内联 computed styles → 图片 base64 → 清理交互属性。
 * 返回处理后的元素 outerHTML，不包裹文档。
 * 用于多页导出的逐页提取场景。
 */
