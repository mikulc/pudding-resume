import { useTranslation } from 'react-i18next';
import { useDiagnosisContext } from '../../../context/DiagnosisContext';
import { useAppUI,useResume } from '../../../context/ResumeContext';
import { DiagnosisBoldText } from '../diagnosis';

import { ActiveSectionWrapper,SectionHeader,useResumeModuleTitles } from '../PreviewShared';

export function WorkExperiencePreview() {
  const { t } = useTranslation('resume');
  const { data } = useResume();
  const { ui } = useAppUI();
  const { items: diagnoses } = useDiagnosisContext();
  const moduleTitles = useResumeModuleTitles();
  const entryTitleLayout = ui.theme.entryTitleLayout ?? 'compact';

  if (!data.workExperience?.length) return null;

  const NUMBERED_RE = /^(\d+)\.\s+(.+)/;
  const BULLET_RE = /^([-*])\s+(.+)/;

  return (
    <ActiveSectionWrapper sectionKey="work" className="mb-5">
      <SectionHeader title={data.sectionConfig.titleOverrides.work ?? moduleTitles.work} sectionKey="work" />
      {data.workExperience.map((work, i) => {
        const lines = (work.highlights ?? '').split('\n');
        const nonEmptyHighlights = lines.filter((line) => line !== '');
        const hasNumberedLines = lines.some((line) => NUMBERED_RE.test(line));
        const hasBulletedLines = lines.some((line) => BULLET_RE.test(line));
        const isListMode = hasNumberedLines || hasBulletedLines;

        const subtitle = [work.position, work.location].filter(Boolean).join(' · ');
        const timeStr = `${work.startDate} - ${work.endDate}`;

        return (
          <div key={work.id} className="mb-4" data-section="work" data-entry-index={i} data-page-entry>
            {entryTitleLayout === 'three-column' ? (
              <div className="entry-title-row grid grid-cols-3 gap-2 mb-1">
                <span className="entity-title truncate">{work.company || t('placeholder.companyName')}</span>
                <span className="text-gray-500 text-sm text-center truncate">{subtitle}</span>
                <span className="text-sm text-gray-500 text-right whitespace-nowrap">{timeStr}</span>
              </div>
            ) : entryTitleLayout === 'stacked' ? (
              <div className="mb-1">
                <div className="entry-title-row flex justify-between gap-2">
                  <span className="entity-title">{work.company || t('placeholder.companyName')}</span>
                  <span className="text-sm text-gray-500 shrink-0 whitespace-nowrap">{timeStr}</span>
                </div>
                {subtitle && <div className="text-gray-500 text-sm">{subtitle}</div>}
              </div>
            ) : (
              <div className="entry-title-row flex justify-between gap-2 mb-1">
                <div className="min-w-0 flex-1">
                  <span className="entity-title">{work.company || t('placeholder.companyName')}</span>
                  <span className="text-gray-500 text-sm ml-2">{work.position}</span>
                  {work.location && <span className="text-gray-400 text-sm ml-2">· {work.location}</span>}
                </div>
                <span className="text-sm text-gray-500 shrink-0 whitespace-nowrap">
                  {work.startDate} - {work.endDate}
                </span>
              </div>
            )}
            {nonEmptyHighlights.length > 0 && (
              <ul
                data-section="work"
                data-entry-id={work.id}
                data-field="highlights"
                className="list-none space-y-1"
              >
                {lines.map((line, i) => {
                  if (!line) return <li key={i} className="h-0 overflow-hidden" aria-hidden="true" />;
                  if (isListMode) {
                    const numMatch = line.match(NUMBERED_RE);
                    if (numMatch) {
                      return (
                        <li key={i} className="text-sm text-gray-700 whitespace-pre-wrap" data-page-atom>
                          <span className="resume-list-marker resume-list-marker--ordered text-gray-400 select-none">{numMatch[1]}. </span>
                          <DiagnosisBoldText text={numMatch[2]} diagnoses={diagnoses} />
                        </li>
                      );
                    }
                    const bulletMatch = line.match(BULLET_RE);
                    if (bulletMatch) {
                      return (
                        <li key={i} className="text-sm text-gray-700 whitespace-pre-wrap" data-page-atom>
                          <span className="resume-list-marker resume-list-marker--bullet text-gray-400 select-none">&bull; </span>
                          <DiagnosisBoldText text={bulletMatch[2]} diagnoses={diagnoses} />
                        </li>
                      );
                    }
                  }
                  return (
                    <li key={i} className="text-sm text-gray-700 whitespace-pre-wrap" data-page-atom data-page-splittable="true">
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

