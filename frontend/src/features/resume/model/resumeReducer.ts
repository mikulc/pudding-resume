import {
  normalizePersonalInfo,
  normalizeResumeEntryIds,
  normalizeSectionConfig,
  type ResumeAction,
  type ResumeData,
} from '../../../types/resume';

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

    case 'SET_WORK_DESCRIPTION':
      return {
        ...state,
        workExperience: (state.workExperience ?? []).map((w) =>
          w.id === action.payload.workId
            ? { ...w, description: action.payload.description }
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

    case 'ADD_CUSTOM_SECTION':
      return {
        ...state,
        customSections: [...(state.customSections ?? []), { id: action.payload.id, name: action.payload.name, content: '' }],
        sectionConfig: {
          ...state.sectionConfig,
          order: [...state.sectionConfig.order, action.payload.id],
        },
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
        customSections: state.customSections.filter((s) => s.id !== action.payload),
        sectionConfig: {
          ...state.sectionConfig,
          order: state.sectionConfig.order.filter((key) => key !== action.payload),
          hidden: state.sectionConfig.hidden.filter((key) => key !== action.payload),
        },
      };

    case 'UPDATE_SECTION_TITLE':
      return {
        ...state,
        sectionConfig: {
          ...state.sectionConfig,
          titleOverrides: {
            ...state.sectionConfig.titleOverrides,
            [action.payload.key]: action.payload.title,
          },
        },
      };

    case 'RESET_SECTION_TITLE': {
      if (!state.sectionConfig.titleOverrides[action.payload]) return state;
      const next = { ...state.sectionConfig.titleOverrides };
      delete next[action.payload];
      return {
        ...state,
        sectionConfig: { ...state.sectionConfig, titleOverrides: next },
      };
    }

    case 'SET_SUMMARY':
      return { ...state, summary: action.payload };

    case 'LOAD_DATA': {
      const payload = action.payload;
      const legacyPayload = payload as unknown as Record<string, unknown>;
      return normalizeResumeEntryIds({
        personalInfo: normalizePersonalInfo(payload.personalInfo),
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
        customSections: (payload.customSections ?? []).map(
          (c) => ({ ...c })
        ),
        sectionConfig: normalizeSectionConfig(payload.sectionConfig, legacyPayload),
      });
    }

    case 'REORDER_SECTIONS':
      return {
        ...state,
        sectionConfig: { ...state.sectionConfig, order: action.payload },
      };

    case 'TOGGLE_SECTION_VISIBILITY': {
      const hidden = state.sectionConfig.hidden;
      const target = action.payload;
      const idx = hidden.indexOf(target);
      const newHidden = idx >= 0
        ? hidden.filter((k) => k !== target)
        : [...hidden, target];
      return {
        ...state,
        sectionConfig: { ...state.sectionConfig, hidden: newHidden },
      };
    }

    case 'RESTORE_STATE':
      return action.payload;

    default:
      return state;
  }
}
