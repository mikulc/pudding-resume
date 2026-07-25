/**
 * 收集当前页面上与简历渲染相关的全局样式
 * 包括 index.css 中的 section-header 等规则、布局 CSS、主题 CSS 变量
 */
export function collectDocumentStyles(
  layoutCSS: string,
  colorStyle: string,
): string {
  // 收集页面上的 <style> 标签和 layout CSS
  const extraStyles: string[] = [];

  // 从 document stylesheets 中提取 .resume-paper 相关的规则
  try {
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        if (!sheet.cssRules) continue;
        for (const rule of Array.from(sheet.cssRules)) {
          if (rule instanceof CSSStyleRule) {
            // 只提取与简历渲染相关的规则
            const selector = rule.selectorText;
            if (
              selector.includes('.resume-paper') ||
              selector.includes('.section-header') ||
              selector.includes('.section-header-icon') ||
              selector.includes('.section-header-bar') ||
              selector.includes('.tag-badge') ||
              selector.includes('.personal-photo') ||
              selector.includes('.personal-name') ||
              selector.includes('.ordrin-branding')
            ) {
              extraStyles.push(rule.cssText);
            }
          }
        }
      } catch {
        // 跨域 stylesheet 无法读取，跳过
      }
    }
  } catch {
    // 静默处理
  }

  return [
    ...extraStyles,
    layoutCSS,
    // 主题色 CSS（内联 style 中已经固化，但保留以防万一）
    colorStyle,
  ].join('\n');
}
