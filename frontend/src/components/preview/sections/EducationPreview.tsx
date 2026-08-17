import { useTranslation } from 'react-i18next';
import { useDiagnosisContext } from '../../../context/DiagnosisContext';
import { useAppUI,useResume } from '../../../context/ResumeContext';
import { DiagnosisBoldText } from '../diagnosis';

import { ActiveSectionWrapper,SectionHeader,useResumeModuleTitles } from '../PreviewShared';

export function EducationPreview() {
  const { t } = useTranslation('resume');
  const { data } = useResume();
  const { ui } = useAppUI();
  const { items: diagnoses } = useDiagnosisContext();
  const moduleTitles = useResumeModuleTitles();
  const entryTitleLayout = ui.theme.entryTitleLayout ?? 'compact';
  const NUMBERED_RE = /^(\d+)\.\s+(.+)/;
  const BULLET_RE = /^([-*])\s+(.+)/;

  if (!data.education?.length) return null;

  return (
    <ActiveSectionWrapper sectionKey="education" className="mb-5">
      <SectionHeader title={data.sectionConfig.titleOverrides.education ?? moduleTitles.education} sectionKey="education" />
      {data.education.map((edu, i) => {
        const lines = (edu.details ?? '').split('\n');
        const hasContent = lines.some((line) => line.trim() !== '');
        const isListMode = lines.some((line) => NUMBERED_RE.test(line) || BULLET_RE.test(line));
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
            {hasContent && (
              <ul
                data-section="education"
                data-entry-id={edu.id}
                data-field="details"
                className="mt-1 list-none space-y-1"
              >
                {lines.map((line, lineIndex) => {
                  if (!line) return <li key={lineIndex} className="h-0 overflow-hidden" aria-hidden="true" />;
                  if (isListMode) {
                    const numbered = line.match(NUMBERED_RE);
                    if (numbered) {
                      return (
                        <li key={lineIndex} className="text-sm text-gray-700 whitespace-pre-wrap" data-page-atom>
                          <span className="resume-list-marker resume-list-marker--ordered text-gray-400 select-none">{numbered[1]}. </span>
                          <DiagnosisBoldText text={numbered[2]} diagnoses={diagnoses} />
                        </li>
                      );
                    }
                    const bulleted = line.match(BULLET_RE);
                    if (bulleted) {
                      return (
                        <li key={lineIndex} className="text-sm text-gray-700 whitespace-pre-wrap" data-page-atom>
                          <span className="resume-list-marker resume-list-marker--bullet text-gray-400 select-none">&bull; </span>
                          <DiagnosisBoldText text={bulleted[2]} diagnoses={diagnoses} />
                        </li>
                      );
                    }
                  }
                  return (
                    <li key={lineIndex} className="text-sm text-gray-700 whitespace-pre-wrap" data-page-atom data-page-splittable="true">
                      <DiagnosisBoldText text={line} diagnoses={diagnoses} />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </ActiveSectionWrapper>
  );
}

