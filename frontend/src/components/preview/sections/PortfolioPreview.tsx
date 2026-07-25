import { useTranslation } from 'react-i18next';
import { useDiagnosisContext } from '../../../context/DiagnosisContext';
import { useResume } from '../../../context/ResumeContext';
import { DiagnosisBoldText } from '../diagnosis';

import { ActiveSectionWrapper,SectionHeader,useResumeModuleTitles } from '../PreviewShared';

export function PortfolioPreview() {
  const { t } = useTranslation('resume');
  const { data } = useResume();
  const { items: diagnoses } = useDiagnosisContext();
  const moduleTitles = useResumeModuleTitles();

  if (!data.portfolio?.length) return null;

  const NUMBERED_RE = /^(\d+)\.\s+(.+)/;
  const BULLET_RE = /^([-*])\s+(.+)/;

  return (
    <ActiveSectionWrapper sectionKey="portfolio" className="mb-6">
      <SectionHeader title={data.sectionTitles?.portfolio ?? moduleTitles.portfolio} sectionKey="portfolio" />
      {data.portfolio.map((item, i) => {
        const lines = (item.description ?? '').split('\n');
        const nonEmptyDescLines = lines.filter((line) => line !== '');
        const hasNumberedLines = lines.some((line) => NUMBERED_RE.test(line));
        const hasBulletedLines = lines.some((line) => BULLET_RE.test(line));
        const isListMode = hasNumberedLines || hasBulletedLines;

        return (
          <div key={item.id} className="mb-4" data-section="portfolio" data-entry-index={i} data-page-entry>
            <div className="mb-1.5">
              <span className="entity-title">{item.name || t('field.portfolioName')}</span>
              {item.link && (
                <span className="text-blue-500 text-sm ml-2">{item.link}</span>
              )}
            </div>
            {nonEmptyDescLines.length > 0 && (
              <ul
                data-section="portfolio"
                data-entry-id={item.id}
                data-field="description"
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

/** 鑷畾涔夋ā鍧楅瑙堬細浣跨敤 SectionHeader + Markdown 鍐呭娓叉煋 */
