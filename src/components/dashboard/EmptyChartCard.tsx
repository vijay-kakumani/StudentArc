import { BarChart3 } from 'lucide-react';

interface EmptyChartCardProps {
  title: string;
  description: string;
  requiredFields: string[];
  explanation?: string;
}

export default function EmptyChartCard({ title, description, requiredFields, explanation }: EmptyChartCardProps) {
  return (
    <div className="bg-card rounded-[16px] border border-card-border shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col h-full overflow-hidden">
      <div className="px-5 py-4 border-b border-card-border bg-card">
        <h3 className="text-[15px] font-semibold text-text-main">{title}</h3>
        <p className="mt-0.5 text-[13px] text-text-muted">{description}</p>
      </div>
      <div className="p-6 flex-1 flex flex-col items-center justify-center bg-surface/50 min-h-[220px]">
        <BarChart3 className="h-8 w-8 text-card-border mb-3" strokeWidth={1.5} />
        <p className="text-[13px] font-medium text-text-main mb-1">Visualization Unavailable</p>
        <p className="text-[12px] text-text-muted text-center max-w-xs mb-4">
          {explanation || "Awaiting imported data to generate this chart."}
        </p>
        <div className="flex flex-wrap justify-center gap-1.5">
          {requiredFields.map((field) => (
            <span key={field} className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-app-bg text-text-muted border border-card-border">
              {field}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
