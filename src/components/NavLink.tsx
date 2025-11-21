import { Link, LinkProps, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface NavLinkProps extends LinkProps {
  activeClassName?: string;
  className?: string;
  children: React.ReactNode;
  end?: boolean;
}

export function NavLink({ 
  to, 
  activeClassName = "bg-muted text-primary font-medium", 
  className = "",
  children,
  end = false,
  ...props 
}: NavLinkProps) {
  const location = useLocation();
  
  const isActive = end 
    ? location.pathname === to
    : location.pathname.startsWith(to as string);

  return (
    <Link
      to={to}
      className={cn(className, isActive && activeClassName)}
      {...props}
    >
      {children}
    </Link>
  );
}
