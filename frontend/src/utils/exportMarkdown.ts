import { ResumeData, SectionKey, getSystemModuleDefaultTitles } from '../types/resume';
import i18n from './i18n';

/** 获取模块标题：优先使用自定义标题，否则使用系统默认标题 */
function getTitle(key: SectionKey, sectionTitles?: Record<string, string>): string {
  const defaultTitles = getSystemModuleDefaultTitles();
  return sectionTitles?.[key] || defaultTitles[key] || key;
}

/** 格式化日期范围 */
function formatDateRange(start: string, end: string): string {
  if (!start && !end) return '';
  const present = i18n.t('field.present', { ns: 'resume' });
  if (!end) return `${start} — ${present}`;
  const startPart = start || '';
  const endPart = end || present;
  return `${startPart} — ${endPart}`;
}

/** 格式化个人信息 */
function formatPersonalInfo(data: ResumeData): string {
  const { personalInfo } = data;
  if (!personalInfo.fullName && !personalInfo.phone && !personalInfo.email) return '';

  const hiddenFields = personalInfo.hiddenFields || [];
  const isHidden = (field: string) => hiddenFields.includes(field);

  const lines: string[] = [];
  if (!isHidden('fullName')) {
    lines.push(`# ${personalInfo.fullName || i18n.t('export.untitledName', { ns: 'resume' })}`);
    lines.push('');
  }

  const contacts: string[] = [];
  if (personalInfo.phone && !isHidden('phone')) contacts.push(`- 📞 ${personalInfo.phone}`);
  if (personalInfo.email && !isHidden('email')) contacts.push(`- 📧 ${personalInfo.email}`);
  if (personalInfo.location && !isHidden('location')) contacts.push(`- 📍 ${personalInfo.location}`);
  if (personalInfo.jobTarget && !isHidden('jobTarget')) contacts.push(`- 🎯 ${personalInfo.jobTarget}`);
  if (personalInfo.jobStatus && !isHidden('jobStatus')) contacts.push(`- 💼 ${personalInfo.jobStatus}`);
  if (contacts.length > 0) {
    lines.push(...contacts);
    lines.push('');
  }

  return lines.join('\n');
}

/** 格式化教育经历 */
function formatEducation(data: ResumeData, sectionTitles?: Record<string, string>): string {
  const entries = data.education ?? [];
  if (entries.length === 0) return '';

  const title = getTitle('education', sectionTitles);
  const lines: string[] = [];
  lines.push(`## ${title}`);
  lines.push('');

  for (const edu of entries) {
    if (!edu.school) continue;
    const headerParts: string[] = [];
    if (edu.major) headerParts.push(edu.major);
    if (edu.degree) headerParts.push(edu.degree);
    const header = headerParts.length > 0 ? ` — ${headerParts.join(' · ')}` : '';
    lines.push(`### ${edu.school}${header}`);

    const date = formatDateRange(edu.startDate, edu.endDate);
    if (date) {
      lines.push('');
      lines.push(date);
    }
    if (edu.courses) {
      lines.push('');
      lines.push(`*${edu.courses}*`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/** 格式化专业技能（skills 字段已是 Markdown） */
function formatSkills(data: ResumeData, sectionTitles?: Record<string, string>): string {
  if (!data.skills?.trim()) return '';

  const title = getTitle('skills', sectionTitles);
  const lines: string[] = [];
  lines.push(`## ${title}`);
  lines.push('');
  lines.push(data.skills.trim());
  lines.push('');

  return lines.join('\n');
}

/** 格式化个人简介（summary 字段已是 Markdown） */
function formatSummary(data: ResumeData, sectionTitles?: Record<string, string>): string {
  if (!data.summary?.trim()) return '';

  const title = getTitle('summary', sectionTitles);
  const lines: string[] = [];
  lines.push(`## ${title}`);
  lines.push('');
  lines.push(data.summary.trim());
  lines.push('');

  return lines.join('\n');
}

/** 格式化工作经历 */
function formatWorkExperience(data: ResumeData, sectionTitles?: Record<string, string>): string {
  const entries = data.workExperience ?? [];
  if (entries.length === 0) return '';

  const title = getTitle('work', sectionTitles);
  const lines: string[] = [];
  lines.push(`## ${title}`);
  lines.push('');

  for (const work of entries) {
    if (!work.company) continue;
    const headerParts: string[] = [work.company];
    if (work.position) headerParts.push(work.position);
    lines.push(`### ${headerParts.join(' — ')}`);

    const meta: string[] = [];
    const date = formatDateRange(work.startDate, work.endDate);
    if (date) meta.push(date);
    if (work.location) meta.push(work.location);
    if (meta.length > 0) {
      lines.push('');
      lines.push(meta.join(' | '));
    }

    if (work.highlights?.trim()) {
      lines.push('');
      lines.push(work.highlights.trim());
    }
    lines.push('');
  }

  return lines.join('\n');
}

/** 格式化项目经历 */
function formatProjects(data: ResumeData, sectionTitles?: Record<string, string>): string {
  const entries = data.projects ?? [];
  if (entries.length === 0) return '';

  const title = getTitle('projects', sectionTitles);
  const lines: string[] = [];
  lines.push(`## ${title}`);
  lines.push('');

  for (const proj of entries) {
    if (!proj.name) continue;
    lines.push(`### ${proj.name}`);

    const meta: string[] = [];
    if (proj.role) meta.push(proj.role);
    const date = formatDateRange(proj.startDate, proj.endDate);
    if (date) meta.push(date);
    if (meta.length > 0) {
      lines.push('');
      lines.push(meta.join(' | '));
    }
    if (proj.link) {
      lines.push('');
      lines.push(`🔗 ${proj.link}`);
    }
    if (proj.highlights?.trim()) {
      lines.push('');
      lines.push(proj.highlights.trim());
    }
    lines.push('');
  }

  return lines.join('\n');
}

/** 格式化荣誉奖项 */
function formatHonors(data: ResumeData, sectionTitles?: Record<string, string>): string {
  const entries = data.honors ?? [];
  if (entries.length === 0) return '';

  const title = getTitle('honors', sectionTitles);
  const lines: string[] = [];
  lines.push(`## ${title}`);
  lines.push('');

  for (const honor of entries) {
    if (!honor.name) continue;
    if (honor.date) {
      lines.push(`- ${honor.name} (${honor.date})`);
    } else {
      lines.push(`- ${honor.name}`);
    }
  }
  lines.push('');

  return lines.join('\n');
}

/** 格式化资质证书 */
function formatCertifications(data: ResumeData, sectionTitles?: Record<string, string>): string {
  const entries = data.certifications ?? [];
  if (entries.length === 0) return '';

  const title = getTitle('certifications', sectionTitles);
  const lines: string[] = [];
  lines.push(`## ${title}`);
  lines.push('');

  for (const cert of entries) {
    if (!cert.name) continue;
    if (cert.date) {
      lines.push(`- ${cert.name} (${cert.date})`);
    } else {
      lines.push(`- ${cert.name}`);
    }
  }
  lines.push('');

  return lines.join('\n');
}

/** 格式化作品展示 */
function formatPortfolio(data: ResumeData, sectionTitles?: Record<string, string>): string {
  const entries = data.portfolio ?? [];
  if (entries.length === 0) return '';

  const title = getTitle('portfolio', sectionTitles);
  const lines: string[] = [];
  lines.push(`## ${title}`);
  lines.push('');

  for (const item of entries) {
    if (!item.name && !item.link) continue;
    if (item.link) {
      const desc = item.description ? ` — ${item.description}` : '';
      lines.push(`- [${item.name || item.link}](${item.link})${desc}`);
    } else {
      lines.push(`- ${item.name}`);
    }
  }
  lines.push('');

  return lines.join('\n');
}

/**
 * 将 ResumeData 转换为 Markdown 字符串。
 * 按 sectionOrder 顺序输出，跳过 hiddenSections 中的模块和空内容模块。
 */
export function generateMarkdown(data: ResumeData): string {
  const order = data.sectionOrder ?? [];
  const hidden = new Set(data.hiddenSections ?? []);
  const sectionTitles = data.sectionTitles;

  // Section key → format function mapping
  const formatters: Record<string, (data: ResumeData, sectionTitles?: Record<string, string>) => string> = {
    personal: formatPersonalInfo,
    education: formatEducation,
    skills: formatSkills,
    work: formatWorkExperience,
    projects: formatProjects,
    honors: formatHonors,
    certifications: formatCertifications,
    portfolio: formatPortfolio,
    summary: formatSummary,
  };

  const sections: string[] = [];

  for (const key of order) {
    if (hidden.has(key)) continue;
    const formatter = formatters[key];
    if (!formatter) {
      // 自定义模块：key 格式为 custom-{timestamp}
      if (key.startsWith('custom-')) {
        const customSection = (data.customSections ?? []).find(s => s.id === key);
        if (customSection && (customSection.name || customSection.content?.trim())) {
          const lines: string[] = [];
          if (customSection.name) {
            lines.push(`## ${customSection.name}`);
            lines.push('');
          }
          if (customSection.content?.trim()) {
            lines.push(customSection.content.trim());
            lines.push('');
          }
          sections.push(lines.join('\n'));
        }
      }
      continue;
    }
    const content = formatter(data, sectionTitles);
    if (content) {
      sections.push(content);
    }
  }

  return sections.join('\n').trim() + '\n';
}
