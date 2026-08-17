import type { Dispatch } from 'react';
import type { ResumeAction, ResumeData } from '../../types/resume';

/**
 * 将后端 section_module 映射到前端 section key，
 * 并在对应简历数据中查找 needle 文本，替换为 replacement。
 * 返回 true 表示替换成功。
 */
export function replaceInResume(
  data: ResumeData,
  sectionModule: string,
  needle: string,
  replacement: string,
  dispatch: Dispatch<ResumeAction>,
): boolean {
  const replaceText = (text: string | undefined) => (
    text?.includes(needle) ? text.replace(needle, replacement) : null
  );

  const replaceInAnySection = (): boolean => {
    const nextSkills = replaceText(data.skills);
    if (nextSkills !== null) {
      dispatch({ type: 'SET_SKILLS', payload: nextSkills });
      return true;
    }

    const nextSummary = replaceText(data.summary);
    if (nextSummary !== null) {
      dispatch({ type: 'SET_SUMMARY', payload: nextSummary });
      return true;
    }

    for (const w of data.workExperience ?? []) {
      const nextDescription = replaceText(w.description);
      if (nextDescription !== null) {
        dispatch({ type: 'SET_WORK_DESCRIPTION', payload: { workId: w.id, description: nextDescription } });
        return true;
      }
    }

    for (const p of data.projects ?? []) {
      const nextHighlights = replaceText(p.highlights);
      if (nextHighlights !== null) {
        dispatch({ type: 'SET_PROJECT_HIGHLIGHTS', payload: { projectId: p.id, highlights: nextHighlights } });
        return true;
      }
    }

    for (const e of data.education ?? []) {
      const nextDetails = replaceText(e.details);
      if (nextDetails !== null) {
        dispatch({ type: 'UPDATE_EDUCATION', payload: { ...e, details: nextDetails } });
        return true;
      }
    }

    for (const h of data.honors ?? []) {
      const nextName = replaceText(h.name);
      if (nextName !== null) {
        dispatch({ type: 'UPDATE_HONOR', payload: { ...h, name: nextName } });
        return true;
      }
    }

    for (const cs of data.customSections ?? []) {
      const nextContent = replaceText(cs.content);
      if (nextContent !== null) {
        dispatch({ type: 'UPDATE_CUSTOM_SECTION', payload: { id: cs.id, updates: { content: nextContent } } });
        return true;
      }
    }

    return false;
  };

  // 后端可能使用 'experience'，前端用 'work'
  const key = sectionModule === 'experience' ? 'work' : sectionModule;

  switch (key) {
    case 'skills':
      {
        const nextSkills = replaceText(data.skills);
        if (nextSkills !== null) {
          dispatch({ type: 'SET_SKILLS', payload: nextSkills });
          return true;
        }
      }
      break;
    case 'summary':
      {
        const nextSummary = replaceText(data.summary);
        if (nextSummary !== null) {
          dispatch({ type: 'SET_SUMMARY', payload: nextSummary });
          return true;
        }
      }
      break;
    case 'work':
      for (const w of data.workExperience ?? []) {
        const nextDescription = replaceText(w.description);
        if (nextDescription !== null) {
          dispatch({ type: 'SET_WORK_DESCRIPTION', payload: { workId: w.id, description: nextDescription } });
          return true;
        }
      }
      break;
    case 'projects':
      for (const p of data.projects ?? []) {
        const nextHighlights = replaceText(p.highlights);
        if (nextHighlights !== null) {
          dispatch({ type: 'SET_PROJECT_HIGHLIGHTS', payload: { projectId: p.id, highlights: nextHighlights } });
          return true;
        }
      }
      break;
    case 'education':
      for (const e of data.education ?? []) {
        const nextDetails = replaceText(e.details);
        if (nextDetails !== null) {
          dispatch({ type: 'UPDATE_EDUCATION', payload: { ...e, details: nextDetails } });
          return true;
        }
      }
      break;
    case 'honors':
      for (const h of data.honors ?? []) {
        const nextName = replaceText(h.name);
        if (nextName !== null) {
          dispatch({ type: 'UPDATE_HONOR', payload: { ...h, name: nextName } });
          return true;
        }
      }
      break;
    default:
      for (const cs of data.customSections ?? []) {
        const nextContent = replaceText(cs.content);
        if (nextContent !== null) {
          dispatch({ type: 'UPDATE_CUSTOM_SECTION', payload: { id: cs.id, updates: { content: nextContent } } });
          return true;
        }
      }
      break;
  }

  return replaceInAnySection();
}

