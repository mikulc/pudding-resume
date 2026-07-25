import { useCallback,useEffect,useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFloatingEditor } from '../../../context/FloatingEditorContext';
import { useLongTextEditor } from '../../../context/LongTextEditorContext';
import { useResume } from '../../../context/ResumeContext';
import { LongTextFieldEntry } from '../LongTextFieldEntry';


// Skills Editor
export function SkillsEditor() {
  const { t } = useTranslation(['editor', 'resume']);
  const { data, dispatch } = useResume();
  const { activeEditorKey, requestOpenEditor } = useLongTextEditor();
  const floatingEditor = useFloatingEditor();
  const editorKey = 'skills:description';
  const isEditorActive = activeEditorKey === editorKey;

  // 抽屉状态
  const [drawerState, setDrawerState] = useState<{
    isOpen: boolean;
    originalText: string;
  }>({ isOpen: false, originalText: '' });

  // 文本实时同步
  const handleDrawerTextChange = useCallback(
    (text: string) => {
      dispatch({ type: 'SET_SKILLS', payload: text });
    },
    [dispatch],
  );

  // 保存 → 更新基准文本并关闭
  const handleDrawerSave = useCallback((savedText: string) => {
    setDrawerState((prev) => ({ ...prev, originalText: savedText, isOpen: false }));
  }, []);

  // 仅保存基准文本，不关闭（Ctrl+S）
  const handleDrawerSaveOnly = useCallback((savedText: string) => {
    setDrawerState((prev) => ({ ...prev, originalText: savedText }));
  }, []);

  // 取消 → 恢复上次保存的文本并关闭
  const handleDrawerCancel = useCallback(() => {
    dispatch({ type: 'SET_SKILLS', payload: drawerState.originalText });
    setDrawerState((prev) => ({ ...prev, isOpen: false }));
  }, [dispatch, drawerState.originalText]);

  // 打开
  const handleOpenDrawer = useCallback(async (triggerRect: DOMRect) => {
    if (drawerState.isOpen) return;
    const canOpen = await requestOpenEditor(editorKey);
    if (!canOpen) return;
    setDrawerState({ isOpen: true, originalText: data.skills });
    floatingEditor.open({
      editorKey,
      title: t('longText.skillsTitle'),
      text: data.skills,
      highlightIndex: 1,
      totalCount: 1,
      anchorRect: triggerRect,
      onTextChange: handleDrawerTextChange,
      onSave: handleDrawerSave,
      onSaveWithoutClose: handleDrawerSaveOnly,
      onCancel: handleDrawerCancel,
    });
  }, [data.skills, drawerState.isOpen, editorKey, floatingEditor, requestOpenEditor, handleDrawerTextChange, handleDrawerSave, handleDrawerSaveOnly, handleDrawerCancel, t]);

  // 保持回调引用最新
  useEffect(() => {
    if (!drawerState.isOpen) return;
    floatingEditor.updateCallbacks({
      onTextChange: handleDrawerTextChange,
      onSave: handleDrawerSave,
      onSaveWithoutClose: handleDrawerSaveOnly,
      onCancel: handleDrawerCancel,
    });
  }, [floatingEditor, drawerState.isOpen, handleDrawerTextChange, handleDrawerSave, handleDrawerSaveOnly, handleDrawerCancel]);

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-[22px] shadow-sm border border-gray-100 p-3">
        <LongTextFieldEntry
          label={t('resume:field.skills')}
          value={data.skills}
          isActive={isEditorActive}
          onOpen={(rect) => void handleOpenDrawer(rect)}
          anchorKey={editorKey}
        />
      </div>
    </div>
  );
}

