/**
 * Diagnosis highlighting for resume preview.
 *
 * Matched diagnosis text is resolved against the visible text produced by the
 * supported inline Markdown syntax, then mapped back into formatted fragments.
 * This keeps bold/italic/underline markup intact while still drawing the
 * diagnosis dashed line on the exact matched characters.
 */
import React from 'react';
import { parseBoldFragments, type TextFragment } from '../../utils/markdown';
import { useDiagnosisContext } from '../../context/DiagnosisContext';
import type { DiagnosisItem } from '../../types/resume';

type DiagnosisRange = {
  start: number;
  end: number;
  diagnosis: DiagnosisItem;
};

export function BoldText({ text }: { text: string }) {
  if (!text) return null;
  const fragments = parseBoldFragments(text);
  return (
    <>
      {fragments.map((frag, i) => (
        <React.Fragment key={i}>
          {renderFormattedFragment(frag, frag.text)}
        </React.Fragment>
      ))}
    </>
  );
}

function getVisibleText(text: string): string {
  return parseBoldFragments(text).map((frag) => frag.text).join('');
}

function findMatchingDiagnoses(text: string, items: DiagnosisItem[]): DiagnosisItem[] {
  if (!text || items.length === 0) return [];
  const visibleText = getVisibleText(text);
  return items.filter((item) => {
    const needle = getVisibleText(item.original_text.trim());
    return needle.length > 0 && visibleText.includes(needle);
  });
}

function collectDiagnosisRanges(text: string, matches: DiagnosisItem[]): DiagnosisRange[] {
  if (matches.length === 0) return [];

  const visibleText = getVisibleText(text);
  if (!visibleText) return [];

  const ranges: DiagnosisRange[] = [];
  for (const diagnosis of matches) {
    const needle = getVisibleText(diagnosis.original_text.trim());
    if (!needle) continue;

    let idx = 0;
    while (idx < visibleText.length) {
      const pos = visibleText.indexOf(needle, idx);
      if (pos === -1) break;

      const overlaps = ranges.some(
        (range) => pos < range.end && pos + needle.length > range.start,
      );
      if (!overlaps) {
        ranges.push({ start: pos, end: pos + needle.length, diagnosis });
        break;
      }
      idx = pos + 1;
    }
  }

  return ranges.sort((a, b) => a.start - b.start);
}

export function DiagnosisBoldText({ text, diagnoses }: { text: string; diagnoses: DiagnosisItem[] }) {
  const diagnosis = useDiagnosisContext();
  const matches = findMatchingDiagnoses(text, diagnoses);

  if (matches.length === 0) {
    return <BoldText text={text} />;
  }

  const ranges = collectDiagnosisRanges(text, matches);

  const handleMarkClick = (e: React.MouseEvent, diagId: string) => {
    e.stopPropagation();
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed && selection.toString().trim().length > 0) return;
    diagnosis.setActiveItem(diagnosis.activeItemId === diagId ? null : diagId);
  };

  return (
    <DiagnosisFormattedText
      text={text}
      ranges={ranges}
      activeItemId={diagnosis.activeItemId}
      onMarkClick={handleMarkClick}
    />
  );
}

function DiagnosisFormattedText({
  text,
  ranges,
  activeItemId,
  onMarkClick,
}: {
  text: string;
  ranges: DiagnosisRange[];
  activeItemId: string | null;
  onMarkClick: (event: React.MouseEvent, diagnosisId: string) => void;
}) {
  if (!text) return null;

  const fragments = parseBoldFragments(text);
  let visibleCursor = 0;

  return (
    <>
      {fragments.map((frag, fragIndex) => {
        const fragStart = visibleCursor;
        const fragEnd = fragStart + frag.text.length;
        visibleCursor = fragEnd;

        const children = renderDiagnosisChildren({
          fragment: frag,
          fragmentStart: fragStart,
          ranges,
          activeItemId,
          onMarkClick,
        });

        return (
          <React.Fragment key={fragIndex}>
            {renderFormattedFragment(frag, children)}
          </React.Fragment>
        );
      })}
    </>
  );
}

function renderDiagnosisChildren({
  fragment,
  fragmentStart,
  ranges,
  activeItemId,
  onMarkClick,
}: {
  fragment: TextFragment;
  fragmentStart: number;
  ranges: DiagnosisRange[];
  activeItemId: string | null;
  onMarkClick: (event: React.MouseEvent, diagnosisId: string) => void;
}): React.ReactNode {
  const fragmentEnd = fragmentStart + fragment.text.length;
  const children: React.ReactNode[] = [];
  let localCursor = 0;

  for (const range of ranges) {
    const overlapStart = Math.max(range.start, fragmentStart);
    const overlapEnd = Math.min(range.end, fragmentEnd);
    if (overlapStart >= overlapEnd) continue;

    const localStart = overlapStart - fragmentStart;
    const localEnd = overlapEnd - fragmentStart;
    if (localStart > localCursor) {
      children.push(fragment.text.slice(localCursor, localStart));
    }

    const item = range.diagnosis;
    const isActive = activeItemId === item.id;
    const sevClass = `diagnosis-sev-${item.severity || 'medium'}`;
    const issueClass = `diagnosis-type-${item.issue_type || 'weak'}`;
    const markClass = `diagnosis-mark ${issueClass} ${sevClass} ${isActive ? 'diagnosis-mark-active' : ''}`;

    children.push(
      <span
        key={`${localStart}-${item.id}`}
        className={markClass}
        data-diagnosis-id={item.id}
        onClick={(event) => onMarkClick(event, item.id)}
      >
        {fragment.text.slice(localStart, localEnd)}
      </span>,
    );
    localCursor = localEnd;
  }

  if (localCursor < fragment.text.length) {
    children.push(fragment.text.slice(localCursor));
  }

  return children.map((child, i) => (
    <React.Fragment key={i}>{child}</React.Fragment>
  ));
}

function renderFormattedFragment(fragment: TextFragment, children: React.ReactNode): React.ReactNode {
  let node = fragment.underline ? <u>{children}</u> : children;

  if (fragment.bold && fragment.italic) {
    node = (
      <strong>
        <em>{node}</em>
      </strong>
    );
  } else if (fragment.bold) {
    node = <strong>{node}</strong>;
  } else if (fragment.italic) {
    node = <em>{node}</em>;
  }

  return node;
}
