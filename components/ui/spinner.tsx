import { Loader2 } from "lucide-react";

type Props = {
  size?: number;
  className?: string;
};

export function Spinner({ size = 16, className = "" }: Props) {
  return (
    <Loader2
      aria-hidden="true"
      className={`animate-spin ${className}`}
      width={size}
      height={size}
    />
  );
}
