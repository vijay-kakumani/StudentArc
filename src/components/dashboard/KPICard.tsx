import type { LucideIcon } from 'lucide-react';
interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  caption?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  tooltip?: string;
}

export default function KPICard({ title, value, icon: Icon, caption, trend, tooltip }: KPICardProps) {

  return (
    <div className="bg-card overflow-hidden rounded-[16px] border border-card-border shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-colors hover:border-text-muted/30 relative">
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="mb-1.5">
              <h3 className="text-[13px] font-medium text-text-muted" title={tooltip}>{title}</h3>
            </div>
            <div className="text-[28px] font-semibold text-text-main tracking-tight leading-none">{value}</div>
            
            {caption && !trend && (
              <p className="text-[12px] text-text-muted mt-2.5">{caption}</p>
            )}
            
            {trend && (
              <div className="mt-2.5 flex items-center text-[12px]">
                <span className={trend.isPositive ? 'text-text-main font-medium' : 'text-text-muted font-medium'}>
                  {trend.value}
                </span>
                <span className="text-text-muted ml-1.5">vs last period</span>
              </div>
            )}
          </div>
          <div className="flex-shrink-0">
            <Icon className="h-[18px] w-[18px] text-text-muted" aria-hidden="true" strokeWidth={2} />
          </div>
        </div>
      </div>
    </div>
  );
}
