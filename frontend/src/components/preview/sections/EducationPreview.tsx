import { useTranslation } from 'react-i18next';
import { useAppUI,useResume } from '../../../context/ResumeContext';

import { ActiveSectionWrapper,SectionHeader,useResumeModuleTitles } from '../PreviewShared';

export function EducationPreview() {
  const { t } = useTranslation('resume');
  const { data } = useResume();
  const { ui } = useAppUI();
  const moduleTitles = useResumeModuleTitles();
  const entryTitleLayout = ui.theme.entryTitleLayout ?? 'compact';

  if (!data.education?.length) return null;

  return (
    <ActiveSectionWrapper sectionKey="education" className="mb-5">
      <SectionHeader title={data.sectionConfig.titleOverrides.education ?? moduleTitles.education} sectionKey="education" />
      {data.education.map((edu, i) => {
        const subtitle = [edu.major, edu.degree].filter(Boolean).join(' · ');
        const timeStr = `${edu.startDate} - ${edu.endDate}`;

        return (
          <div key={edu.id} className="mb-3" data-section="education" data-entry-index={i} data-page-entry>
            {entryTitleLayout === 'three-column' ? (
              <div className="entry-title-row grid grid-cols-3 gap-2">
                <span className="entity-title truncate">{edu.school || t('placeholder.schoolName')}</span>
                <span className="text-gray-500 text-sm text-center truncate">{subtitle}</span>
                <span className="text-sm text-gray-500 text-right whitespace-nowrap">{timeStr}</span>
              </div>
            ) : entryTitleLayout === 'stacked' ? (
              <div>
                <div className="entry-title-row flex justify-between gap-2">
                  <span className="entity-title">{edu.school || t('placeholder.schoolName')}</span>
                  <span className="text-sm text-gray-500 shrink-0 whitespace-nowrap">{timeStr}</span>
                </div>
                {subtitle && <div className="text-gray-500 text-sm">{subtitle}</div>}
              </div>
            ) : (
              <div className="entry-title-row flex justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <span className="entity-title">{edu.school || t('placeholder.schoolName')}</span>
                  <span className="text-gray-500 text-sm ml-2">{edu.major}</span>
                  {edu.degree && <span className="text-gray-400 text-sm ml-2">· {edu.degree}</span>}
                </div>
                <span className="text-sm text-gray-500 shrink-0 whitespace-nowrap">
                  {edu.startDate} - {edu.endDate}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </ActiveSectionWrapper>
  );
}

