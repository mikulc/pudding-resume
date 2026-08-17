import { useDiagnosisContext } from '../../../context/DiagnosisContext';
import { useResume } from '../../../context/ResumeContext';
import { DiagnosisBoldText } from '../diagnosis';

import { ActiveSectionWrapper,SectionHeader,useResumeModuleTitles } from '../PreviewShared';

export function SkillsPreview() {
  const { data } = useResume();
  const { items: diagnoses } = useDiagnosisContext();
  const moduleTitles = useResumeModuleTitles();

  if (!data.skills?.trim()) return null;

  const lines = data.skills.split('\n');
  if (lines.length === 0) return null;

  const nonEmptyLines = lines.filter((line) => line !== '');
  if (nonEmptyLines.length === 0) return null;

  // Detect list lines.
  const NUMBERED_RE = /^(\d+)\.\s+(.+)/;
  const BULLET_RE = /^([-*])\s+(.+)/;
  const hasNumberedLines = lines.some((line) => NUMBERED_RE.test(line));
  const hasBulletedLines = lines.some((line) => BULLET_RE.test(line));

  if (hasNumberedLines || hasBulletedLines) {
    return (
      <ActiveSectionWrapper sectionKey="skills" className="mb-5">
        <SectionHeader title={data.sectionConfig.titleOverrides.skills ?? moduleTitles.skills} sectionKey="skills" />
        <ul data-section="skills" data-field="skills" className="list-none space-y-1">
          {lines.map((line, i) => {
            if (!line) return <li key={i} className="h-0 overflow-hidden" aria-hidden="true" />;
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
            return (
              <li key={i} className="text-sm text-gray-700 whitespace-pre-wrap" data-page-atom data-page-splittable="true">
                <DiagnosisBoldText text={line} diagnoses={diagnoses} />
              </li>
            );
          })}
        </ul>
      </ActiveSectionWrapper>
    );
  }

  // 鏃犲垪琛ㄦ爣璁帮細娓叉煋涓虹函鏂囨湰娈佃惤
  return (
    <ActiveSectionWrapper sectionKey="skills" className="mb-5">
      <SectionHeader title={data.sectionConfig.titleOverrides.skills ?? moduleTitles.skills} sectionKey="skills" />
      <div data-section="skills" data-field="skills" className="space-y-1">
        {lines.map((line, i) => {
          if (!line) return <p key={i} className="h-0 overflow-hidden" aria-hidden="true" />;
          return (
            <p key={i} className="text-sm text-gray-700 break-words select-text whitespace-pre-wrap" data-page-atom data-page-splittable="true">
              <DiagnosisBoldText text={line} diagnoses={diagnoses} />
            </p>
          );
        })}
      </div>
    </ActiveSectionWrapper>
  );
}

