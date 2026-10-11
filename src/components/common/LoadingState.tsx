import { Loader2 } from 'lucide-react';

export default function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 w-full h-full min-h-[200px]">
      <div className="relative">
        <Loader2 className="w-8 h-8 text-text-main animate-spin" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#F47735] animate-[spin_1.5s_linear_infinite]" />
      </div>
      <p className="mt-4 text-[13px] font-medium text-text-muted">{message}</p>
    </div>
  );
}
