import type { ResumeData } from '../../types/resume';

export function ensureDefaults(data: unknown): ResumeData {
  const d = data as Record<string, unknown>;
  return {
    personalInfo: (d.personalInfo as ResumeData['personalInfo']) || {
      fullName: '',
      phone: '',
      email: '',
      photoUrl: '',
    },
    summary: (typeof d.summary === 'string' ? d.summary : undefined) as string | undefined,
    education: Array.isArray(d.education) ? d.education as ResumeData['education'] : [],
    workExperience: Array.isArray(d.workExperience) ? d.workExperience as ResumeData['workExperience'] : [],
    projects: Array.isArray(d.projects) ? d.projects as ResumeData['projects'] : [],
    skills: typeof d.skills === 'string' ? d.skills : '',
    honors: Array.isArray(d.honors) ? d.honors as ResumeData['honors'] : undefined,
    certifications: Array.isArray(d.certifications) ? d.certifications as ResumeData['certifications'] : undefined,
    portfolio: Array.isArray(d.portfolio) ? d.portfolio as ResumeData['portfolio'] : undefined,
    customSections: Array.isArray(d.customSections) ? d.customSections as ResumeData['customSections'] : undefined,
    sectionOrder: Array.isArray(d.sectionOrder) ? d.sectionOrder as ResumeData['sectionOrder'] : undefined,
    sectionTitles: (d.sectionTitles as ResumeData['sectionTitles']) || undefined,
    hiddenSections: Array.isArray(d.hiddenSections) ? d.hiddenSections as ResumeData['hiddenSections'] : undefined,
  };
}

/**
 * JSON 结构校验
 * 检查导入数据是否具备 ResumeData 的基本结构
 */
export function validateResumeData(data: unknown): data is ResumeData {
  if (!data || typeof data !== 'object') return false;

  const d = data as Record<string, unknown>;

  // 必须有 personalInfo 字段且包含 fullName
  if (!d.personalInfo || typeof d.personalInfo !== 'object') return false;
  const pi = d.personalInfo as Record<string, unknown>;
  if (typeof pi.fullName !== 'string') return false;

  // 核心数组字段必须是数组（如果存在）
  if (d.education !== undefined && !Array.isArray(d.education)) return false;
  if (d.workExperience !== undefined && !Array.isArray(d.workExperience)) return false;
  if (d.projects !== undefined && !Array.isArray(d.projects)) return false;

  return true;
}

/**
 * JSON 导入：读取文件 → 解析 JSON → 校验结构 → 返回 ResumeData
 */
