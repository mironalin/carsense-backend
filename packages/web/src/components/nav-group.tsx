import type { LucideIcon } from "lucide-react";

import { Link, useLocation, useParams } from "@tanstack/react-router";
import { atom, useAtom } from "jotai";
import { useEffect } from "react";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export const pathnameAtom = atom("");

export function NavGroup({
  label,
  items,
  isFooter = false,
  ...props
}: {
  label?: string;
  items: {
    title: string;
    url: string;
    icon?: LucideIcon;
  }[];
  isFooter?: boolean;
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const { vehicleId } = useParams({ strict: false });
  const { pathname: currentPathname } = useLocation();

  const [, setPathname] = useAtom(pathnameAtom);

  // Update pathname when route changes, but not during render
  useEffect(() => {
    const activeItem = items.find((item) => {
      const fullHref = isFooter ? item.url : `/app/${vehicleId}${item.url}`;
      return currentPathname === fullHref;
    });

    if (activeItem) {
      setPathname(activeItem.title);
    }
  }, [currentPathname, items, vehicleId, isFooter, setPathname]);

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent className="flex flex-col">
        <SidebarGroupLabel>{label}</SidebarGroupLabel>
        <SidebarMenu>
          {items.map((item) => {
            const fullHref = isFooter ? item.url : `/app/${vehicleId}${item.url}`;
            const isActive = currentPathname === fullHref;
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton tooltip={item.title} asChild isActive={isActive}>
                  <Link to={fullHref}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
