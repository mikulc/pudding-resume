import { useTranslation } from 'react-i18next';
import { useResume } from '../../../context/ResumeContext';

import { ActiveSectionWrapper,SectionHeader,useResumeModuleTitles } from '../PreviewShared';

export function HonorPreview() {
  const { t } = useTranslation('resume');
  const { data } = useResume();
  const moduleTitles = useResumeModuleTitles();

  if (!data.honors?.length) return null;

  return (
    <ActiveSectionWrapper sectionKey="honors" className="mb-6">
      <SectionHeader title={data.sectionConfig.titleOverrides.honors ?? moduleTitles.honors} sectionKey="honors" />
      {data.honors.map((honor, i) => (
        <div key={honor.id} className="flex items-baseline justify-between gap-2 mb-2.5" data-section="honors" data-entry-index={i} data-page-entry>
          <span className="entity-title min-w-0">{honor.name || t('field.honorName')}</span>
          <span className="text-sm text-gray-500 shrink-0 whitespace-nowrap">{honor.date}</span>
        </div>
      ))}
    </ActiveSectionWrapper>
  );
}

