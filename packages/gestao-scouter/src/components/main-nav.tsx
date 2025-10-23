import { cn } from "@/lib/utils";

export function MainNav({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <nav
      className={cn("flex items-center space-x-4 lg:space-x-6", className)}
      {...props}
    >
      <div className="flex items-center space-x-2">
        <span className="font-bold">Gestão Scouter</span>
      </div>
    </nav>
  );
}