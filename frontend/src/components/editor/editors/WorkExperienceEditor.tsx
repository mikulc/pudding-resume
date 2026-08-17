import { useCallback,useEffect,useRef,useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFloatingEditor } from '../../../context/FloatingEditorContext';
import { useLongTextEditor } from '../../../context/LongTextEditorContext';
import { useResume } from '../../../context/ResumeContext';
import {
createResumeEntryId,
WorkEntry
} from '../../../types/resume';
import { AddEntryButton,EntryCardHeader } from '../EditorCommon';
import { LongTextFieldEntry } from '../LongTextFieldEntry';
import { StyledDateInput,StyledInput } from '../StyledInputs';


// Work Experience Editor
export function WorkExperienceEditor() {
  const { t } = useTranslation(['editor', 'resume']);
  const { data, dispatch } = useResume();
  const { activeEditorKey, requestOpenEditor } = useLongTextEditor();
  const floatingEditor = useFloatingEditor();


  // 抽屉状态：key 为 workId，值为 { isOpen, originalText }
  const [drawerStates, setDrawerStates] = useState<Record<string, { isOpen: boolean; originalText: string }>>({});

  const addWork = () => {
    const entry: WorkEntry = {
      id: createResumeEntryId(),
      company: '',
      location: '',
      position: '',
      startDate: '',
      endDate: '',
      description: '',
    };
    dispatch({ type: 'ADD_WORK_EXPERIENCE', payload: entry });
  };

  const handleDrawerTextChange = useCallback(
    (workId: string, text: string) => {
      dispatch({ type: 'SET_WORK_DESCRIPTION', payload: { workId, description: text } });
    },
    [dispatch],
  );

  const handleDrawerSave = useCallback((workId: string, savedText: string) => {
    setDrawerStates((prev) => ({ ...prev, [workId]: { ...prev[workId], originalText: savedText, isOpen: false } }));
  }, []);

  const handleDrawerSaveOnly = useCallback((workId: string, savedText: string) => {
    setDrawerStates((prev) => ({ ...prev, [workId]: { ...prev[workId], originalText: savedText } }));
  }, []);

  const handleDrawerCancel = useCallback((workId: string) => {
    const ds = drawerStates[workId];
    if (ds) {
      dispatch({ type: 'SET_WORK_DESCRIPTION', payload: { workId, description: ds.originalText } });
    }
    setDrawerStates((prev) => ({ ...prev, [workId]: { ...prev[workId], isOpen: false } }));
  }, [dispatch, drawerStates]);

  // 打开
  const handleOpenDrawer = useCallback(async (workId: string, triggerRect: DOMRect) => {
    if (drawerStates[workId]?.isOpen) return;
    const editorKey = `work:${workId}:description`;
    const canOpen = await requestOpenEditor(editorKey);
    if (!canOpen) return;
    const work = data.workExperience.find((w) => w.id === workId);
    setDrawerStates((prev) => ({ ...prev, [workId]: { isOpen: true, originalText: work?.description ?? '' } }));
    floatingEditor.open({
      editorKey,
      title: t('longText.workTitle'),
      text: work?.description ?? '',
      highlightIndex: 1,
      totalCount: 1,
      anchorRect: triggerRect,
      onTextChange: (text: string) => handleDrawerTextChange(workId, text),
      onSave: (text: string) => handleDrawerSave(workId, text),
      onSaveWithoutClose: (text: string) => handleDrawerSaveOnly(workId, text),
      onCancel: () => handleDrawerCancel(workId),
    });
  }, [data.workExperience, drawerStates, requestOpenEditor, floatingEditor, handleDrawerTextChange, handleDrawerSave, handleDrawerSaveOnly, handleDrawerCancel, t]);

  // 保持回调引用最新（基于当前打开的工作项）
  const openWorkIdRef = useRef<string | null>(null);
  useEffect(() => {
    const openWorkId = Object.keys(drawerStates).find((id) => drawerStates[id]?.isOpen) ?? null;
    if (!openWorkId) return;
    openWorkIdRef.current = openWorkId;
    floatingEditor.updateCallbacks({
      onTextChange: (text: string) => handleDrawerTextChange(openWorkId, text),
      onSave: (text: string) => handleDrawerSave(openWorkId, text),
      onSaveWithoutClose: (text: string) => handleDrawerSaveOnly(openWorkId, text),
      onCancel: () => handleDrawerCancel(openWorkId),
    });
  }, [floatingEditor, drawerStates, handleDrawerTextChange, handleDrawerSave, handleDrawerSaveOnly, handleDrawerCancel]);

  return (
    <div className="space-y-3">
      {data.workExperience.map((work, i) => (
        <div key={work.id} className="bg-white rounded-[22px] shadow-sm border border-gray-100 p-3 space-y-3">
          {(() => {
            const editorKey = `work:${work.id}:description`;
            const isEditorActive = activeEditorKey === editorKey;
            return (
              <>
              <EntryCardHeader index={i} onDelete={() => dispatch({ type: 'DELETE_WORK_EXPERIENCE', payload: work.id })} />
          <StyledInput label={t('resume:field.company')} value={work.company} onChange={(v) => dispatch({ type: 'UPDATE_WORK_EXPERIENCE', payload: { ...work, company: v } })} placeholder={t('resume:placeholder.companyExample')} size="md" />
          <StyledInput label={t('resume:field.position')} value={work.position} onChange={(v) => dispatch({ type: 'UPDATE_WORK_EXPERIENCE', payload: { ...work, position: v } })} placeholder={t('resume:placeholder.positionExample')} size="md" />
          <StyledInput label={t('resume:field.workLocation')} value={work.location} onChange={(v) => dispatch({ type: 'UPDATE_WORK_EXPERIENCE', payload: { ...work, location: v } })} placeholder={t('resume:placeholder.workLocationExample')} size="md" />
          <div className="grid grid-cols-2 gap-1">
            <StyledDateInput className="min-w-0 !px-0" label={t('resume:field.startDate')} value={work.startDate} onChange={(v) => dispatch({ type: 'UPDATE_WORK_EXPERIENCE', payload: { ...work, startDate: v } })} placeholder="2020-09" size="md" />
            <StyledDateInput className="min-w-0 !px-0" label={t('resume:field.endDate')} value={work.endDate} onChange={(v) => dispatch({ type: 'UPDATE_WORK_EXPERIENCE', payload: { ...work, endDate: v } })} placeholder="2023-06" size="md" />
          </div>
          <LongTextFieldEntry
            label={t('resume:field.workHighlights')}
            value={work.description}
            isActive={isEditorActive}
            onOpen={(rect) => void handleOpenDrawer(work.id, rect)}
            anchorKey={editorKey}
          />
              </>
            );
          })()}
        </div>
      ))}
      <AddEntryButton onClick={addWork} label={t('sectionAction.addWork')} />
    </div>
  );
}

