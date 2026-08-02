import type { ResumeAction, ResumeData } from '../../../types/resume';
import { DEFAULT_SECTION_ORDER } from '../../../types/resume';

export function resumeReducer(state: ResumeData, action: ResumeAction): ResumeData {
  switch (action.type) {
    case 'SET_PERSONAL_INFO':
      return { ...state, personalInfo: { ...state.personalInfo, ...action.payload } };

    case 'ADD_EDUCATION':
      return { ...state, education: [...(state.education ?? []), action.payload] };

    case 'UPDATE_EDUCATION':
      return {
        ...state,
        education: (state.education ?? []).map((e) =>
          e.id === action.payload.id ? action.payload : e
        ),
      };

    case 'DELETE_EDUCATION':
      return {
        ...state,
        education: (state.education ?? []).filter((e) => e.id !== action.payload),
      };

    case 'SET_SKILLS':
      return { ...state, skills: action.payload };

    case 'ADD_WORK_EXPERIENCE':
      return { ...state, workExperience: [...(state.workExperience ?? []), action.payload] };

    case 'UPDATE_WORK_EXPERIENCE':
      return {
        ...state,
        workExperience: (state.workExperience ?? []).map((w) =>
          w.id === action.payload.id ? action.payload : w
        ),
      };

    case 'DELETE_WORK_EXPERIENCE':
      return {
        ...state,
        workExperience: (state.workExperience ?? []).filter((w) => w.id !== action.payload),
      };

    case 'SET_WORK_HIGHLIGHTS':
      return {
        ...state,
        workExperience: (state.workExperience ?? []).map((w) =>
          w.id === action.payload.workId
            ? { ...w, highlights: action.payload.highlights }
            : w
        ),
      };

    case 'ADD_PROJECT':
      return { ...state, projects: [...(state.projects ?? []), action.payload] };

    case 'UPDATE_PROJECT':
      return {
        ...state,
        projects: (state.projects ?? []).map((p) =>
          p.id === action.payload.id ? action.payload : p
        ),
      };

    case 'DELETE_PROJECT':
      return {
        ...state,
        projects: (state.projects ?? []).filter((p) => p.id !== action.payload),
      };

    case 'SET_PROJECT_HIGHLIGHTS':
      return {
        ...state,
        projects: (state.projects ?? []).map((p) =>
          p.id === action.payload.projectId
            ? { ...p, highlights: action.payload.highlights }
            : p
        ),
      };

    case 'ADD_HONOR':
      return { ...state, honors: [...(state.honors ?? []), action.payload] };

    case 'UPDATE_HONOR':
      return {
        ...state,
        honors: (state.honors ?? []).map((h) =>
          h.id === action.payload.id ? action.payload : h
        ),
      };

    case 'DELETE_HONOR':
      return {
        ...state,
        honors: (state.honors ?? []).filter((h) => h.id !== action.payload),
      };

    case 'ADD_CERTIFICATION':
      return { ...state, certifications: [...(state.certifications ?? []), action.payload] };

    case 'UPDATE_CERTIFICATION':
      return {
        ...state,
        certifications: (state.certifications ?? []).map((c) =>
          c.id === action.payload.id ? action.payload : c
        ),
      };

    case 'DELETE_CERTIFICATION':
      return {
        ...state,
        certifications: (state.certifications ?? []).filter((c) => c.id !== action.payload),
      };

    case 'ADD_PORTFOLIO':
      return { ...state, portfolio: [...(state.portfolio ?? []), action.payload] };

    case 'UPDATE_PORTFOLIO':
      return {
        ...state,
        portfolio: (state.portfolio ?? []).map((p) =>
          p.id === action.payload.id ? action.payload : p
        ),
      };

    case 'DELETE_PORTFOLIO':
      return {
        ...state,
        portfolio: (state.portfolio ?? []).filter((p) => p.id !== action.payload),
      };

    case 'ADD_CUSTOM_SECTION':
      return {
        ...state,
        customSections: [...(state.customSections ?? []), { id: action.payload.id, name: action.payload.name, content: '' }],
        sectionOrder: [...(state.sectionOrder ?? DEFAULT_SECTION_ORDER), action.payload.id],
      };

    case 'UPDATE_CUSTOM_SECTION':
      return {
        ...state,
        customSections: (state.customSections ?? []).map((s) =>
          s.id === action.payload.id ? { ...s, ...action.payload.updates } : s
        ),
      };

    case 'DELETE_CUSTOM_SECTION':
      return {
        ...state,
        customSections: (state.customSections ?? []).filter((s) => s.id !== action.payload),
        sectionOrder: (state.sectionOrder ?? []).filter((k) => k !== action.payload),
      };

    case 'UPDATE_SECTION_TITLE':
      return {
        ...state,
        sectionTitles: { ...(state.sectionTitles ?? {}), [action.payload.key]: action.payload.title },
      };

    case 'RESET_SECTION_TITLE': {
      if (!state.sectionTitles || !state.sectionTitles[action.payload]) return state;
      const next = { ...state.sectionTitles };
      delete next[action.payload];
      return { ...state, sectionTitles: Object.keys(next).length > 0 ? next : undefined };
    }

    case 'SET_SUMMARY':
      return { ...state, summary: action.payload };

    case 'LOAD_DATA': {
      const payload = action.payload;
      return {
        personalInfo: {
          fullName: payload.personalInfo?.fullName ?? '',
          phone: payload.personalInfo?.phone ?? '',
          email: payload.personalInfo?.email ?? '',
          photoUrl: payload.personalInfo?.photoUrl ?? '',
          photoStyle: payload.personalInfo?.photoStyle,
          jobStatus: payload.personalInfo?.jobStatus ?? '',
          jobTarget: payload.personalInfo?.jobTarget ?? '',
          location: payload.personalInfo?.location ?? '',
          displayMode: payload.personalInfo?.displayMode ?? 'icon',
          photoLayout: payload.personalInfo?.photoLayout,
          photoLayoutCustomized: payload.personalInfo?.photoLayoutCustomized,
          hiddenFields: payload.personalInfo?.hiddenFields ?? [],
          fieldOrder: payload.personalInfo?.fieldOrder ?? undefined,
          customFields: payload.personalInfo?.customFields ?? {},
          iconMap: payload.personalInfo?.iconMap ?? {},
          fieldLabels: payload.personalInfo?.fieldLabels ?? {},
        },
        summary: payload.summary ?? '',
        education: payload.education ?? [],
        skills: Array.isArray(payload.skills) ? (payload.skills as string[]).map((s, i) => `${i + 1}. ${s}`).join('\n') : (payload.skills ?? ''),
        workExperience: (payload.workExperience ?? []).map(
          (w) => {
            const h = (w as { highlights?: string[] | string }).highlights;
            return {
              ...w,
              highlights: Array.isArray(h) ? h.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n') : (h ?? ''),
            };
          }
        ) as ResumeData['workExperience'],
        projects: (payload.projects ?? []).map(
          (p) => {
            const h = (p as { highlights?: string[] | string }).highlights;
            return {
              ...p,
              highlights: Array.isArray(h) ? h.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n') : (h ?? ''),
            };
          }
        ) as ResumeData['projects'],
        honors: (payload.honors ?? []).map(
          (h) => ({ ...h })
        ) as ResumeData['honors'],
        certifications: (payload.certifications ?? []).map(
          (c) => ({ ...c })
        ) as ResumeData['certifications'],
        portfolio: (payload.portfolio ?? []).map(
          (p) => ({ ...p })
        ) as ResumeData['portfolio'],
        customSections: (payload.customSections ?? []).map(
          (c) => ({ ...c })
        ),
        sectionOrder: payload.sectionOrder ?? DEFAULT_SECTION_ORDER,
        sectionTitles: payload.sectionTitles ?? {},
        hiddenSections: payload.hiddenSections ?? [],
      };
    }

    case 'REORDER_SECTIONS':
      return { ...state, sectionOrder: action.payload };

    case 'TOGGLE_SECTION_VISIBILITY': {
      const hidden = state.hiddenSections ?? [];
      const target = action.payload;
      const idx = hidden.indexOf(target);
      const newHidden = idx >= 0
        ? hidden.filter((k) => k !== target)
        : [...hidden, target];
      return { ...state, hiddenSections: newHidden };
    }

    case 'RESTORE_STATE':
      return action.payload;

    default:
      return state;
  }
}
