import type { ReactNode } from "react";

interface Props {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  children?: ReactNode;
}

export function StatCard({ label, value, hint, children }: Props) {
  return (
    <div className="flex flex-col rounded-xl border border-[#1C343A]/10 bg-white p-5">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-[#1C343A]/50">
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold text-[#1C343A]">{value}</div>
      {hint && <div className="mt-1 text-xs text-[#1C343A]/60">{hint}</div>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
