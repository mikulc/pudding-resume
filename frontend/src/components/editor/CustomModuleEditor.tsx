import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useResume } from '../../context/ResumeContext';
import { useLongTextEditor } from '../../context/LongTextEditorContext';
import { useFloatingEditor } from '../../context/FloatingEditorContext';
import { LongTextFieldEntry } from './LongTextFieldEntry';

interface CustomModuleEditorProps {
  sectionKey: string;
}

/** 自定义模块编辑器内容区（模块头部 hover 按钮在 EditorPanel 中处理） */
export function CustomModuleEditor({ sectionKey }: CustomModuleEditorProps) {
  const { t } = useTranslation('editor');
  const { data, dispatch } = useResume();
  const { activeEditorKey, requestOpenEditor } = useLongTextEditor();
  const floatingEditor = useFloatingEditor();
  const customSection = data.customSections?.find((s) => s.id === sectionKey);
  const editorKey = `custom:${sectionKey}:content`;
  const isEditorActive = activeEditorKey === editorKey;

  const [drawerState, setDrawerState] = useState<{
    isOpen: boolean;
    originalText: string;
  }>({ isOpen: false, originalText: '' });

  const handleDrawerTextChange = useCallback(
    (text: string) => {
      dispatch({
        type: 'UPDATE_CUSTOM_SECTION',
        payload: { id: sectionKey, updates: { content: text } },
      });
    },
    [dispatch, sectionKey],
  );

  const handleDrawerSave = useCallback((savedText: string) => {
    setDrawerState((prev) => ({ ...prev, originalText: savedText, isOpen: false }));
  }, []);

  const handleDrawerSaveOnly = useCallback((savedText: string) => {
    setDrawerState((prev) => ({ ...prev, originalText: savedText }));
  }, []);

  const handleDrawerCancel = useCallback(() => {
    dispatch({
      type: 'UPDATE_CUSTOM_SECTION',
      payload: { id: sectionKey, updates: { content: drawerState.originalText } },
    });
    setDrawerState((prev) => ({ ...prev, isOpen: false }));
  }, [dispatch, sectionKey, drawerState.originalText]);

  const handleOpenDrawer = useCallback(async (triggerRect: DOMRect) => {
    if (drawerState.isOpen) return;
    const canOpen = await requestOpenEditor(editorKey);
    if (!canOpen) return;
    setDrawerState({ isOpen: true, originalText: customSection?.content || '' });
    floatingEditor.open({
      editorKey,
      title: t('customModuleEditor.editTitle', { name: customSection?.name || t('customModule.defaultName') }),
      text: customSection?.content || '',
      highlightIndex: 1,
      totalCount: 1,
      anchorRect: triggerRect,
      onTextChange: handleDrawerTextChange,
      onSave: handleDrawerSave,
      onSaveWithoutClose: handleDrawerSaveOnly,
      onCancel: handleDrawerCancel,
    });
  }, [customSection?.content, customSection?.name, drawerState.isOpen, editorKey, floatingEditor, requestOpenEditor, handleDrawerTextChange, handleDrawerSave, handleDrawerSaveOnly, handleDrawerCancel, t]);

  useEffect(() => {
    if (!drawerState.isOpen) return;
    floatingEditor.updateCallbacks({
      onTextChange: handleDrawerTextChange,
      onSave: handleDrawerSave,
      onSaveWithoutClose: handleDrawerSaveOnly,
      onCancel: handleDrawerCancel,
    });
  }, [floatingEditor, drawerState.isOpen, handleDrawerTextChange, handleDrawerSave, handleDrawerSaveOnly, handleDrawerCancel]);

  if (!customSection) return null;

  return (
    <div className="space-y-3">
      <LongTextFieldEntry
        label={t('customModuleEditor.content')}
        value={customSection.content || ''}
        isActive={isEditorActive}
        onOpen={(rect) => void handleOpenDrawer(rect)}
        anchorKey={editorKey}
        emptyText={t('customModuleEditor.emptyContent')}
      />
    </div>
  );
}
