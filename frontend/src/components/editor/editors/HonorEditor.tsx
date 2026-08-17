import { useTranslation } from 'react-i18next';
import { useResume } from '../../../context/ResumeContext';
import {
createResumeEntryId,
HonorEntry
} from '../../../types/resume';
import { AddEntryButton,EntryCardHeader } from '../EditorCommon';
import { StyledDateInput,StyledInput } from '../StyledInputs';


// Honor Editor
export function HonorEditor() {
  const { t } = useTranslation(['editor', 'resume']);
  const { data, dispatch } = useResume();


  const addHonor = () => {
    const entry: HonorEntry = {
      id: createResumeEntryId(),
      name: '',
      date: '',
    };
    dispatch({ type: 'ADD_HONOR', payload: entry });
  };

  const updateHonor = (entry: HonorEntry) => {
    dispatch({ type: 'UPDATE_HONOR', payload: entry });
  };

  const deleteHonor = (id: string) => {
    dispatch({ type: 'DELETE_HONOR', payload: id });
  };

  return (
    <div className="space-y-3">
      {(data.honors || []).map((honor, index) => (
        <div key={honor.id} className="bg-white rounded-[22px] shadow-sm border border-gray-100 p-3 space-y-3">
          <EntryCardHeader index={index} onDelete={() => deleteHonor(honor.id)} />
          <StyledInput label={t('resume:field.honorName')} value={honor.name} onChange={(v) => updateHonor({ ...honor, name: v })} placeholder={t('resume:placeholder.honorNameExample')} size="md" />
          <StyledDateInput label={t('resume:field.awardDate')} value={honor.date} onChange={(v) => updateHonor({ ...honor, date: v })} placeholder="2023-06" size="md" />
        </div>
      ))}
      <AddEntryButton onClick={addHonor} label={t('sectionAction.addHonor')} />
    </div>
  );
}

