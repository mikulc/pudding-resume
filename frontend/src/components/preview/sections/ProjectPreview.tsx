import { useTranslation } from 'react-i18next';
import { useDiagnosisContext } from '../../../context/DiagnosisContext';
import { useAppUI,useResume } from '../../../context/ResumeContext';
import { DiagnosisBoldText } from '../diagnosis';

import { ActiveSectionWrapper,SectionHeader,useResumeModuleTitles } from '../PreviewShared';

export function ProjectPreview() {
  const { t } = useTranslation('resume');
  const { data } = useResume();
  const { ui } = useAppUI();
  const { items: diagnoses } = useDiagnosisContext();
  const moduleTitles = useResumeModuleTitles();
  const titleLayout = ui.theme.titleLayout ?? 'compact';

  if (!data.projects?.length) return null;

  const NUMBERED_RE = /^(\d+)\.\s+(.+)/;
  const BULLET_RE = /^([-*])\s+(.+)/;

  return (
    <ActiveSectionWrapper sectionKey="projects" className="mb-5">
      <SectionHeader title={data.sectionTitles?.projects ?? moduleTitles.projects} sectionKey="projects" />
      {data.projects.map((proj, i) => {
        const lines = (proj.highlights ?? '').split('\n');
        const nonEmptyProjHighlights = lines.filter((line) => line !== '');
        const hasNumberedLines = lines.some((line) => NUMBERED_RE.test(line));
        const hasBulletedLines = lines.some((line) => BULLET_RE.test(line));
        const isListMode = hasNumberedLines || hasBulletedLines;

        const timeBlock = (
          <div className="text-sm text-gray-500 text-right shrink-0 whitespace-nowrap">
            <div>{proj.startDate} - {proj.endDate}</div>
            {proj.link && (
              <div className="text-blue-500 text-xs">{proj.link}</div>
            )}
          </div>
        );

        return (
          <div key={proj.id} className="mb-4" data-section="projects" data-entry-index={i} data-page-entry>
            {titleLayout === 'three-column' ? (
              <div className="entry-title-row grid grid-cols-3 gap-2 mb-1">
                <span className="entity-title truncate">{proj.name || t('field.projectName')}</span>
                <span className="text-gray-500 text-sm text-center truncate">{proj.role}</span>
                <div className="text-sm text-gray-500 text-right whitespace-nowrap">
                  <div>{proj.startDate} - {proj.endDate}</div>
                  {proj.link && (
                    <div className="text-blue-500 text-xs truncate">{proj.link}</div>
                  )}
                </div>
              </div>
            ) : titleLayout === 'stacked' ? (
              <div className="mb-1">
                <div className="entry-title-row flex justify-between gap-2">
                  <span className="entity-title">{proj.name || t('field.projectName')}</span>
                  {timeBlock}
                </div>
                {proj.role && <div className="text-gray-500 text-sm">{proj.role}</div>}
              </div>
            ) : (
              <div className="entry-title-row flex justify-between gap-2 mb-1">
                <div className="min-w-0 flex-1">
                  <span className="entity-title">{proj.name || t('field.projectName')}</span>
                  <span className="text-gray-500 text-sm ml-2">{proj.role}</span>
                </div>
                {timeBlock}
              </div>
            )}
            {nonEmptyProjHighlights.length > 0 && (
              <ul
                data-section="projects"
                data-entry-id={proj.id}
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

