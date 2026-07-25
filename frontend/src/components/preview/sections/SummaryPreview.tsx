import { useDiagnosisContext } from '../../../context/DiagnosisContext';
import { useResume } from '../../../context/ResumeContext';
import { DiagnosisBoldText } from '../diagnosis';

import { ActiveSectionWrapper,SectionHeader,useResumeModuleTitles } from '../PreviewShared';

export function SummaryPreview() {
  const { data } = useResume();
  const { items: diagnoses } = useDiagnosisContext();
  const moduleTitles = useResumeModuleTitles();

  if (!data.summary) return null;

  const NUMBERED_RE = /^(\d+)\.\s+(.+)/;
  const BULLET_RE = /^([-*])\s+(.+)/;
  const lines = data.summary.split('\n');
  const nonEmptySummaryLines = lines.filter((line) => line !== '');
  const hasNumberedLines = lines.some((line) => NUMBERED_RE.test(line));
  const hasBulletedLines = lines.some((line) => BULLET_RE.test(line));
  const isListMode = hasNumberedLines || hasBulletedLines;

  return (
    <ActiveSectionWrapper sectionKey="summary" className="mb-6">
      <SectionHeader title={data.sectionTitles?.summary ?? moduleTitles.summary} sectionKey="summary" />
      {nonEmptySummaryLines.length > 0 && (
        <ul
          data-section="summary"
          data-field="summary"
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
    </ActiveSectionWrapper>
  );
}

