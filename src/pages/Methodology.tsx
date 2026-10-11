import { Info } from 'lucide-react';

export default function Methodology() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div>
        <h2 className="text-[28px] font-semibold text-text-main tracking-tight">How Scores Are Calculated</h2>
        <p className="mt-1 text-[14px] text-text-muted">
          Understand the documented methodology behind the Student Success Score, Academic Support Flags, and Placement Readiness.
        </p>
      </div>

      <div className="bg-card border border-card-border rounded-[16px] p-6 space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <h3 className="text-[18px] font-semibold text-text-main border-b border-card-border pb-2">1. Overall Student Success Score</h3>
        <p className="text-[13px] text-text-main leading-relaxed">
          The Student Success Score is a unified metric (0-100) designed to measure academic progress and learning engagement. It is calculated deterministically from available data and is <strong>not a machine-learning prediction</strong>.
        </p>
        <ul className="list-disc list-inside text-[13px] text-text-main space-y-1 mt-2 ml-2">
          <li><strong>Academic Performance (65%):</strong> Combines CGPA (70%) and Number of Backlogs (30%).</li>
          <li><strong>Learning Engagement (35%):</strong> Combines Attendance Percentage (35%), Assignments Completed (30%), Online Learning Activity (20%), and Engagement Score (15%).</li>
        </ul>
        <p className="text-[13px] text-text-muted mt-2">
          <em>Missing Data Handling:</em> If a component (e.g., Online Learning Activity) is missing for a student, its weight is proportionally redistributed to the available metrics so the student is not penalized with a zero.
        </p>
      </div>

      <div className="bg-card border border-card-border rounded-[16px] p-6 space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <h3 className="text-[18px] font-semibold text-text-main border-b border-card-border pb-2">2. Placement Preparation Score</h3>
        <p className="text-[13px] text-text-main leading-relaxed">
          Placement readiness is evaluated separately from academic performance because strong academic students may still need interview or resume support. It uses a 0-100 scale based on:
        </p>
        <ul className="list-disc list-inside text-[13px] text-text-main space-y-1 mt-2 ml-2">
          <li>Coding Assessment Score (30%)</li>
          <li>Aptitude Assessment Score (25%)</li>
          <li>Mock Interview Score (25%)</li>
          <li>Technical Skills Score (10%)</li>
          <li>Soft Skills Score (10%)</li>
        </ul>
        <div className="mt-4 flex items-start gap-3 p-3 bg-surface rounded-[12px] border border-card-border">
          <Info className="w-5 h-5 text-text-muted flex-shrink-0" />
          <p className="text-[13px] text-text-muted">
            <strong>Note:</strong> All raw scores (e.g., CGPA on a 10-point scale, Mock Interviews on a 100-point scale) are normalized to percentages before being weighted.
          </p>
        </div>
      </div>

      <div className="bg-card border border-card-border rounded-[16px] p-6 space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <h3 className="text-[18px] font-semibold text-text-main border-b border-card-border pb-2">3. Support Flags & Review Rules</h3>
        <p className="text-[13px] text-text-main leading-relaxed">
          Students are flagged for faculty review when their computed scores fall below specific thresholds. These flags highlight students who may benefit from proactive interventions.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="p-4 border border-card-border rounded-[12px] bg-surface">
            <h4 className="font-semibold text-[14px] text-text-main">Academic Support Flag</h4>
            <p className="text-[13px] text-text-muted mt-1">Triggered when a student's Academic Performance score falls below <strong>60</strong>.</p>
          </div>
          <div className="p-4 border border-card-border rounded-[12px] bg-surface">
            <h4 className="font-semibold text-[14px] text-text-main">Placement Support Flag</h4>
            <p className="text-[13px] text-text-muted mt-1">Triggered when a student's Placement Preparation score falls below <strong>60</strong>.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
