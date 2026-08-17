import { useCallback,useEffect,useRef,useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useResume } from '../../../context/ResumeContext';
import {
  createResumeEntryId,
  EducationEntry
} from '../../../types/resume';
import {
applyAutoFillSafely,
calculateEndDate,
calculateStartDate,
computeAutoFill,
getDegreeDuration,
} from '../../../utils/educationDateUtils';
import { AddEntryButton,EntryCardHeader } from '../EditorCommon';
import { StyledComboInput,StyledDateInput,StyledInput } from '../StyledInputs';


// Education Editor
export function EducationEditor() {
  const { t } = useTranslation(['editor', 'resume']);
  const { data, dispatch } = useResume();

  // 追踪每条教育经历各时间字段的来源（auto / manual）
  // key: education.id, value: { startDate, endDate }
  const fieldSourcesRef = useRef<Record<string, { startDate: 'auto' | 'manual'; endDate: 'auto' | 'manual' }>>({});

  // 追踪每条教育经历的提示信息 key: education.id
  const [hints, setHints] = useState<Record<string, string | null>>({});

  // 初始化清理：确保 ref 中追踪的条目与实际数据同步
  useEffect(() => {
    const currentIds = new Set(data.education.map((e) => e.id));
    const tracked = fieldSourcesRef.current;
    for (const id of Object.keys(tracked)) {
      if (!currentIds.has(id)) delete tracked[id];
    }
    // 为新条目初始化，通过反向比对自动推算值来恢复 auto/manual 标记
    for (const edu of data.education) {
      if (!tracked[edu.id]) {
        const duration = getDegreeDuration(edu.degree);
        let startSource: 'auto' | 'manual' = edu.startDate ? 'manual' : 'auto';
        let endSource: 'auto' | 'manual' = edu.endDate ? 'manual' : 'auto';

        // 若能识别学历且两个时间都存在，检测哪个是自动推算的
        if (duration !== null && edu.startDate && edu.endDate) {
          const expectedEnd = calculateEndDate(edu.startDate, duration);
          const expectedStart = calculateStartDate(edu.endDate, duration);
          if (expectedEnd === edu.endDate) endSource = 'auto';
          if (expectedStart === edu.startDate) startSource = 'auto';
        }

        tracked[edu.id] = { startDate: startSource, endDate: endSource };
      }
    }
  }, [data.education]);

  const getSources = (id: string) => {
    if (!fieldSourcesRef.current[id]) {
      fieldSourcesRef.current[id] = { startDate: 'manual', endDate: 'manual' };
    }
    return fieldSourcesRef.current[id];
  };

  const addEducation = () => {
    const entry: EducationEntry = {
      id: createResumeEntryId(),
      school: '',
      major: '',
      degree: '',
      startDate: '',
      endDate: '',
      courses: '',
    };
    fieldSourcesRef.current[entry.id] = { startDate: 'auto', endDate: 'auto' };
    dispatch({ type: 'ADD_EDUCATION', payload: entry });
  };

  const updateEducation = useCallback((entry: EducationEntry) => {
    dispatch({ type: 'UPDATE_EDUCATION', payload: entry });
  }, [dispatch]);

  const deleteEducation = (id: string) => {
    delete fieldSourcesRef.current[id];
    setHints((prev) => { const next = { ...prev }; delete next[id]; return next; });
    dispatch({ type: 'DELETE_EDUCATION', payload: id });
  };

  /**
   * 尝试对某条教育经历执行自动推算
   * 返回推算后的 EducationEntry（若有变更），否则返回 null
   */
  const tryAutoFill = useCallback(
    (edu: EducationEntry): EducationEntry | null => {
      const sources = getSources(edu.id);
      const result = computeAutoFill(edu.degree, edu.startDate, edu.endDate, sources);
      const safe = applyAutoFillSafely(result, edu.startDate, edu.endDate, sources);

      if (safe.startDate === null && safe.endDate === null) return null;

      const updated = { ...edu };
      let changed = false;

      if (safe.startDate !== null) {
        updated.startDate = safe.startDate;
        sources.startDate = 'auto';
        changed = true;
      }
      if (safe.endDate !== null) {
        updated.endDate = safe.endDate;
        sources.endDate = 'auto';
        changed = true;
      }

      // 生成提示
      if (changed && safe.hintKey) {
        const degreeName = edu.degree || t('resume:degree.bachelor');
        setHints((prev) => ({
          ...prev,
          [edu.id]: t(`editor:${safe.hintKey}`, { degree: degreeName }),
        }));
      }

      return changed ? updated : null;
    },
    [t],
  );

  // 处理学历变化
  const handleDegreeChange = useCallback(
    (edu: EducationEntry, newDegree: string) => {
      const updated = { ...edu, degree: newDegree };
      const autoResult = tryAutoFill(updated);
      updateEducation(autoResult || updated);
    },
    [tryAutoFill, updateEducation],
  );

  // 处理开始时间变化
  const handleStartDateChange = useCallback(
    (edu: EducationEntry, newStartDate: string) => {
      // 标记为手动输入
      const sources = getSources(edu.id);
      sources.startDate = 'manual';
      // 清除该条目的提示（用户正在手动操作）
      setHints((prev) => ({ ...prev, [edu.id]: null }));

      const updated = { ...edu, startDate: newStartDate };
      const autoResult = tryAutoFill(updated);
      updateEducation(autoResult || updated);
    },
    [tryAutoFill, updateEducation],
  );

  // 处理结束时间变化
  const handleEndDateChange = useCallback(
    (edu: EducationEntry, newEndDate: string) => {
      const sources = getSources(edu.id);
      sources.endDate = 'manual';
      setHints((prev) => ({ ...prev, [edu.id]: null }));

      const updated = { ...edu, endDate: newEndDate };
      const autoResult = tryAutoFill(updated);
      updateEducation(autoResult || updated);
    },
    [tryAutoFill, updateEducation],
  );

  return (
    <div className="space-y-3">
      {data.education.map((edu, index) => {
        const hint = hints[edu.id];
        return (
          <div key={edu.id} className="bg-white rounded-[22px] shadow-sm border border-gray-100 p-3 space-y-3">
            <EntryCardHeader index={index} onDelete={() => deleteEducation(edu.id)} />
            <StyledInput label={t('resume:field.school')} value={edu.school} onChange={(v) => updateEducation({ ...edu, school: v })} placeholder={t('resume:placeholder.schoolExample')} size="md" />
            <StyledInput label={t('resume:field.major')} value={edu.major} onChange={(v) => updateEducation({ ...edu, major: v })} placeholder={t('resume:placeholder.majorExample')} size="md" />
            <StyledComboInput
              label={t('resume:field.degree')}
              value={edu.degree}
              onChange={(v) => handleDegreeChange(edu, v)}
              options={[t('resume:degree.associate'), t('resume:degree.bachelor'), t('resume:degree.master'), t('resume:degree.mba'), t('resume:degree.phd')]}
              placeholder={t('resume:placeholder.degreeInput')}
              size="md"
            />
            <div className="grid grid-cols-2 gap-1">
              <StyledDateInput className="min-w-0 !px-0" label={t('resume:field.startDate')} value={edu.startDate} onChange={(v) => handleStartDateChange(edu, v)} placeholder="2020-09" size="md" />
              <StyledDateInput className="min-w-0 !px-0" label={t('resume:field.endDate')} value={edu.endDate} onChange={(v) => handleEndDateChange(edu, v)} placeholder="2024-06" size="md" />
            </div>
            {hint && (
              <div className="flex items-start gap-1.5 px-0.5">
                <svg className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
                </svg>
                <span className="text-xs text-blue-500/80 leading-relaxed">{hint}</span>
              </div>
            )}
          </div>
        );
      })}
      <AddEntryButton onClick={addEducation} label={t('sectionAction.addEducation')} />
    </div>
  );
}

