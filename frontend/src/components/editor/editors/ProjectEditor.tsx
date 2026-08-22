import { useCallback,useEffect,useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFloatingEditor } from '../../../context/FloatingEditorContext';
import { useLongTextEditor } from '../../../context/LongTextEditorContext';
import { useResume } from '../../../context/ResumeContext';
import {
createResumeEntryId,
ProjectEntry
} from '../../../types/resume';
import { AddEntryButton,EntryCardHeader } from '../EditorCommon';
import { LongTextFieldEntry } from '../LongTextFieldEntry';
import { StyledDateInput,StyledInput } from '../StyledInputs';


// Project Editor
export function ProjectEditor() {
  const { t } = useTranslation(['editor', 'resume', 'common']);
  const { data, dispatch } = useResume();
  const { activeEditorKey, requestOpenEditor } = useLongTextEditor();
  const floatingEditor = useFloatingEditor();


  const [drawerStates, setDrawerStates] = useState<Record<string, { isOpen: boolean; originalText: string }>>({});

  const addProject = () => {
    const entry: ProjectEntry = {
      id: createResumeEntryId(),
      name: '',
      role: '',
      startDate: '',
      endDate: '',
      link: '',
      description: '',
    };
    dispatch({ type: 'ADD_PROJECT', payload: entry });
  };

  const handleDrawerTextChange = useCallback(
    (projectId: string, text: string) => {
      dispatch({ type: 'SET_PROJECT_DESCRIPTION', payload: { projectId, description: text } });
    },
    [dispatch],
  );

  const handleDrawerSave = useCallback((projectId: string, savedText: string) => {
    setDrawerStates((prev) => ({ ...prev, [projectId]: { ...prev[projectId], originalText: savedText, isOpen: false } }));
  }, []);

  const handleDrawerSaveOnly = useCallback((projectId: string, savedText: string) => {
    setDrawerStates((prev) => ({ ...prev, [projectId]: { ...prev[projectId], originalText: savedText } }));
  }, []);

  const handleDrawerCancel = useCallback((projectId: string) => {
    const ds = drawerStates[projectId];
    if (ds) {
      dispatch({ type: 'SET_PROJECT_DESCRIPTION', payload: { projectId, description: ds.originalText } });
    }
    setDrawerStates((prev) => ({ ...prev, [projectId]: { ...prev[projectId], isOpen: false } }));
  }, [dispatch, drawerStates]);

  const handleOpenDrawer = useCallback(async (projectId: string, triggerRect: DOMRect) => {
    if (drawerStates[projectId]?.isOpen) return;
    const editorKey = `project:${projectId}:description`;
    const canOpen = await requestOpenEditor(editorKey);
    if (!canOpen) return;
    const project = data.projects.find((p) => p.id === projectId);
    setDrawerStates((prev) => ({ ...prev, [projectId]: { isOpen: true, originalText: project?.description ?? '' } }));
    floatingEditor.open({
      editorKey,
      title: t('longText.projectTitle'),
      text: project?.description ?? '',
      highlightIndex: 1,
      totalCount: 1,
      anchorRect: triggerRect,
      onTextChange: (text: string) => handleDrawerTextChange(projectId, text),
      onSave: (text: string) => handleDrawerSave(projectId, text),
      onSaveWithoutClose: (text: string) => handleDrawerSaveOnly(projectId, text),
      onCancel: () => handleDrawerCancel(projectId),
    });
  }, [data.projects, drawerStates, requestOpenEditor, floatingEditor, handleDrawerTextChange, handleDrawerSave, handleDrawerSaveOnly, handleDrawerCancel, t]);

  // 保持回调引用最新
  useEffect(() => {
    const openProjectId = Object.keys(drawerStates).find((id) => drawerStates[id]?.isOpen) ?? null;
    if (!openProjectId) return;
    floatingEditor.updateCallbacks({
      onTextChange: (text: string) => handleDrawerTextChange(openProjectId, text),
      onSave: (text: string) => handleDrawerSave(openProjectId, text),
      onSaveWithoutClose: (text: string) => handleDrawerSaveOnly(openProjectId, text),
      onCancel: () => handleDrawerCancel(openProjectId),
    });
  }, [floatingEditor, drawerStates, handleDrawerTextChange, handleDrawerSave, handleDrawerSaveOnly, handleDrawerCancel]);

  return (
    <div className="space-y-3">
      {data.projects.map((proj, i) => (
        <div key={proj.id} className="bg-white rounded-[22px] shadow-sm border border-gray-100 p-3 space-y-3">
          {(() => {
            const editorKey = `project:${proj.id}:description`;
            const isEditorActive = activeEditorKey === editorKey;
            return (
              <>
              <EntryCardHeader index={i} onDelete={() => dispatch({ type: 'DELETE_PROJECT', payload: proj.id })} />
          <StyledInput label={t('resume:field.projectName')} value={proj.name} onChange={(v) => dispatch({ type: 'UPDATE_PROJECT', payload: { ...proj, name: v } })} placeholder={t('resume:placeholder.projectNameExample')} size="md" />
          <StyledInput label={t('resume:field.projectRole')} value={proj.role} onChange={(v) => dispatch({ type: 'UPDATE_PROJECT', payload: { ...proj, role: v } })} placeholder={t('resume:placeholder.projectRoleExample')} size="md" />
          <div className="grid grid-cols-1 gap-3">
            <StyledDateInput label={t('resume:field.startDate')} value={proj.startDate} onChange={(v) => dispatch({ type: 'UPDATE_PROJECT', payload: { ...proj, startDate: v } })} placeholder="2022-03" size="md" />
            <StyledDateInput label={t('resume:field.endDate')} value={proj.endDate} onChange={(v) => dispatch({ type: 'UPDATE_PROJECT', payload: { ...proj, endDate: v } })} placeholder="2022-12" size="md" />
          </div>
          <StyledInput label={`${t('resume:field.projectLink')} (${t('common:optional')})`} value={proj.link} onChange={(v) => dispatch({ type: 'UPDATE_PROJECT', payload: { ...proj, link: v } })} placeholder="https://github.com/example" size="md" />
          <LongTextFieldEntry
            label={t('resume:field.projectDescription')}
            value={proj.description}
            isActive={isEditorActive}
            onOpen={(rect) => void handleOpenDrawer(proj.id, rect)}
            anchorKey={editorKey}
          />
              </>
            );
          })()}
        </div>
      ))}
      <AddEntryButton onClick={addProject} label={t('sectionAction.addProject')} />
    </div>
  );
}

