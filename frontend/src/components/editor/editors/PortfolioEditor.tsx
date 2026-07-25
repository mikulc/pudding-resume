import { useCallback,useEffect,useState } from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import { useFloatingEditor } from '../../../context/FloatingEditorContext';
import { useLongTextEditor } from '../../../context/LongTextEditorContext';
import { useResume } from '../../../context/ResumeContext';
import {
PortfolioEntry
} from '../../../types/resume';
import { AddEntryButton,EntryCardHeader } from '../EditorCommon';
import { LongTextFieldEntry } from '../LongTextFieldEntry';
import { StyledInput } from '../StyledInputs';


// Portfolio Editor
export function PortfolioEditor() {
  const { t } = useTranslation(['editor', 'resume']);
  const { data, dispatch } = useResume();
  const { activeEditorKey, requestOpenEditor } = useLongTextEditor();
  const floatingEditor = useFloatingEditor();


  const [drawerStates, setDrawerStates] = useState<Record<string, { isOpen: boolean; originalText: string }>>({});

  const addPortfolio = () => {
    const entry: PortfolioEntry = {
      id: uuidv4(),
      name: '',
      link: '',
      description: '',
    };
    dispatch({ type: 'ADD_PORTFOLIO', payload: entry });
  };

  const updatePortfolio = (entry: PortfolioEntry) => {
    dispatch({ type: 'UPDATE_PORTFOLIO', payload: entry });
  };

  const deletePortfolio = (id: string) => {
    dispatch({ type: 'DELETE_PORTFOLIO', payload: id });
  };

  const handleDrawerTextChange = useCallback(
    (portfolioId: string, text: string) => {
      const item = (data.portfolio || []).find((p) => p.id === portfolioId);
      if (item) dispatch({ type: 'UPDATE_PORTFOLIO', payload: { ...item, description: text } });
    },
    [dispatch, data.portfolio],
  );

  const handleDrawerSave = useCallback((portfolioId: string, savedText: string) => {
    setDrawerStates((prev) => ({ ...prev, [portfolioId]: { ...prev[portfolioId], originalText: savedText, isOpen: false } }));
  }, []);

  const handleDrawerSaveOnly = useCallback((portfolioId: string, savedText: string) => {
    setDrawerStates((prev) => ({ ...prev, [portfolioId]: { ...prev[portfolioId], originalText: savedText } }));
  }, []);

  const handleDrawerCancel = useCallback((portfolioId: string) => {
    const ds = drawerStates[portfolioId];
    if (ds) {
      const item = (data.portfolio || []).find((p) => p.id === portfolioId);
      if (item) dispatch({ type: 'UPDATE_PORTFOLIO', payload: { ...item, description: ds.originalText } });
    }
    setDrawerStates((prev) => ({ ...prev, [portfolioId]: { ...prev[portfolioId], isOpen: false } }));
  }, [dispatch, data.portfolio, drawerStates]);

  const handleOpenDrawer = useCallback(async (portfolioId: string, triggerRect: DOMRect) => {
    if (drawerStates[portfolioId]?.isOpen) return;
    const editorKey = `portfolio:${portfolioId}:description`;
    const canOpen = await requestOpenEditor(editorKey);
    if (!canOpen) return;
    const item = (data.portfolio || []).find((p) => p.id === portfolioId);
    setDrawerStates((prev) => ({ ...prev, [portfolioId]: { isOpen: true, originalText: item?.description ?? '' } }));
    floatingEditor.open({
      editorKey,
      title: t('longText.portfolioTitle'),
      text: item?.description ?? '',
      highlightIndex: 1,
      totalCount: 1,
      anchorRect: triggerRect,
      onTextChange: (text: string) => handleDrawerTextChange(portfolioId, text),
      onSave: (text: string) => handleDrawerSave(portfolioId, text),
      onSaveWithoutClose: (text: string) => handleDrawerSaveOnly(portfolioId, text),
      onCancel: () => handleDrawerCancel(portfolioId),
    });
  }, [data.portfolio, drawerStates, requestOpenEditor, floatingEditor, handleDrawerTextChange, handleDrawerSave, handleDrawerSaveOnly, handleDrawerCancel, t]);

  // 保持回调引用最新
  useEffect(() => {
    const openId = Object.keys(drawerStates).find((id) => drawerStates[id]?.isOpen) ?? null;
    if (!openId) return;
    floatingEditor.updateCallbacks({
      onTextChange: (text: string) => handleDrawerTextChange(openId, text),
      onSave: (text: string) => handleDrawerSave(openId, text),
      onSaveWithoutClose: (text: string) => handleDrawerSaveOnly(openId, text),
      onCancel: () => handleDrawerCancel(openId),
    });
  }, [floatingEditor, drawerStates, handleDrawerTextChange, handleDrawerSave, handleDrawerSaveOnly, handleDrawerCancel]);

  return (
    <div className="space-y-3">
      {(data.portfolio || []).map((item, index) => (
        <div key={item.id} className="bg-white rounded-[22px] shadow-sm border border-gray-100 p-3 space-y-3">
          {(() => {
            const editorKey = `portfolio:${item.id}:description`;
            const isEditorActive = activeEditorKey === editorKey;
            return (
              <>
          <EntryCardHeader index={index} onDelete={() => deletePortfolio(item.id)} />
          <StyledInput label={t('resume:field.portfolioName')} value={item.name} onChange={(v) => updatePortfolio({ ...item, name: v })} placeholder={t('resume:placeholder.portfolioNameExample')} size="md" />
          <StyledInput label={t('resume:field.portfolioLink')} value={item.link} onChange={(v) => updatePortfolio({ ...item, link: v })} placeholder="https://example.com" size="md" />
          <LongTextFieldEntry
            label={t('resume:field.portfolioDescription')}
            value={item.description}
            isActive={isEditorActive}
            onOpen={(rect) => void handleOpenDrawer(item.id, rect)}
            anchorKey={editorKey}
          />
              </>
            );
          })()}
        </div>
      ))}
      <AddEntryButton onClick={addPortfolio} label={t('sectionAction.addPortfolio')} />
    </div>
  );
}

