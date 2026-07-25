import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import { useResume } from '../../../context/ResumeContext';
import {
CertificationEntry
} from '../../../types/resume';
import { AddEntryButton,EntryCardHeader } from '../EditorCommon';
import { StyledDateInput,StyledInput } from '../StyledInputs';


// Certification Editor
export function CertificationEditor() {
  const { t } = useTranslation(['editor', 'resume']);
  const { data, dispatch } = useResume();


  const addCertification = () => {
    const entry: CertificationEntry = {
      id: uuidv4(),
      name: '',
      date: '',
    };
    dispatch({ type: 'ADD_CERTIFICATION', payload: entry });
  };

  const updateCertification = (entry: CertificationEntry) => {
    dispatch({ type: 'UPDATE_CERTIFICATION', payload: entry });
  };

  const deleteCertification = (id: string) => {
    dispatch({ type: 'DELETE_CERTIFICATION', payload: id });
  };

  return (
    <div className="space-y-3">
      {(data.certifications || []).map((cert, index) => (
        <div key={cert.id} className="bg-white rounded-[22px] shadow-sm border border-gray-100 p-3 space-y-3">
          <EntryCardHeader index={index} onDelete={() => deleteCertification(cert.id)} />
          <StyledInput label={t('resume:field.certName')} value={cert.name} onChange={(v) => updateCertification({ ...cert, name: v })} placeholder={t('resume:placeholder.certNameExample')} size="md" />
          <StyledDateInput label={t('resume:field.certDate')} value={cert.date} onChange={(v) => updateCertification({ ...cert, date: v })} placeholder="2023.06" size="md" />
        </div>
      ))}
      <AddEntryButton onClick={addCertification} label={t('sectionAction.addCertification')} />
    </div>
  );
}

