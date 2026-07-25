import i18nInstance from '../../utils/i18n';
import type { ResumeData } from '../../types/resume';

/**
 * 收集简历中的所有文本内容，拼接成 AI 可分析的纯文本。保留模块标签帮助 AI 定位。
 */
export function normalizeDiagnosisLanguage(language: string): 'zh-CN' | 'en-US' {
  return language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US';
}

export function collectResumeText(data: ResumeData, language = i18nInstance.language): string {
  const parts: string[] = [];
  const normalizedLanguage = normalizeDiagnosisLanguage(language);
  const promptText = (key: string) => i18nInstance.t(`diagnosisPrompt.${key}`, { ns: 'editor', lng: normalizedLanguage });

  // 个人简介
  if (data.summary?.trim()) {
    parts.push(`[${promptText('summary')}]\n${data.summary}`);
  }

  // 专业技能
  if (data.skills?.trim()) {
    parts.push(`[${promptText('skills')}]\n${data.skills}`);
  }

  // 教育经历
  if (data.education?.length) {
    parts.push(`[${promptText('education')}]`);
    data.education.forEach((edu) => {
      parts.push(`- ${[edu.school, edu.major, edu.degree].filter(Boolean).join(' · ')}`);
      if (edu.courses?.trim()) parts.push(`  ${promptText('courses')}: ${edu.courses}`);
    });
  }

  // 工作经历
  if (data.workExperience?.length) {
    parts.push(`[${promptText('workExperience')}]`);
    data.workExperience.forEach((work) => {
      parts.push(`- ${[work.company, work.position].filter(Boolean).join(' - ')}`);
      if (work.highlights?.trim()) {
        parts.push(`  ${work.highlights}`);
      }
    });
  }

  // 项目经历
  if (data.projects?.length) {
    parts.push(`[${promptText('projects')}]`);
    data.projects.forEach((proj) => {
      parts.push(`- ${[proj.name, proj.role].filter(Boolean).join(' - ')}`);
      if (proj.highlights?.trim()) {
        parts.push(`  ${proj.highlights}`);
      }
    });
  }

  // 荣誉奖项
  if (data.honors?.length) {
    parts.push(`[${promptText('honors')}]`);
    data.honors.forEach((h) => {
      parts.push(`- ${h.name}${h.date ? ` (${h.date})` : ''}`);
    });
  }

  // 资质证书
  if (data.certifications?.length) {
    parts.push(`[${promptText('certifications')}]`);
    data.certifications.forEach((c) => {
      parts.push(`- ${c.name}${c.date ? ` (${c.date})` : ''}`);
    });
  }

  // 作品展示
  if (data.portfolio?.length) {
    parts.push(`[${promptText('portfolio')}]`);
    data.portfolio.forEach((p) => {
      parts.push(`- ${p.name}`);
      if (p.description?.trim()) parts.push(`  ${p.description}`);
    });
  }

  // 自定义模块
  if (data.customSections?.length) {
    data.customSections.forEach((cs) => {
      if (cs.content?.trim()) {
        parts.push(`[${cs.name || promptText('customSection')}]\n${cs.content}`);
      }
    });
  }

  return parts.join('\n\n');
}

