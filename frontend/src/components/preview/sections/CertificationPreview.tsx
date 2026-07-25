import { useTranslation } from 'react-i18next';
import { useResume } from '../../../context/ResumeContext';

import { ActiveSectionWrapper,SectionHeader,useResumeModuleTitles } from '../PreviewShared';

export function CertificationPreview() {
  const { t } = useTranslation('resume');
  const { data } = useResume();
  const moduleTitles = useResumeModuleTitles();

  if (!data.certifications?.length) return null;

  return (
    <ActiveSectionWrapper sectionKey="certifications" className="mb-6">
      <SectionHeader title={data.sectionTitles?.certifications ?? moduleTitles.certifications} sectionKey="certifications" />
      {data.certifications.map((cert, i) => (
        <div key={cert.id} className="flex items-baseline justify-between gap-2 mb-2.5" data-section="certifications" data-entry-index={i} data-page-entry>
          <span className="entity-title min-w-0">{cert.name || t('field.certName')}</span>
          <span className="text-sm text-gray-500 shrink-0 whitespace-nowrap">{cert.date}</span>
        </div>
      ))}
    </ActiveSectionWrapper>
  );
}

