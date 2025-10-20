import { Code2, Folder, FileCheck, Settings, Sparkles, Terminal, GitCompare, MessageSquare, Database, Gift, BarChart, Layers, Target, Shield } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";

const menuItems = [
  {
    title: "Projects",
    url: "/dashboard",
    icon: Folder,
    testId: "link-projects",
  },
  {
    title: "Workbench",
    url: "/workbench",
    icon: Layers,
    testId: "link-workbench",
  },
  {
    title: "Templates",
    url: "/templates",
    icon: Code2,
    testId: "link-templates",
  },
  {
    title: "Dev Console",
    url: "/dev",
    icon: Terminal,
    testId: "link-dev",
  },
  {
    title: "Diffs",
    url: "/diff",
    icon: GitCompare,
    testId: "link-diff",
  },
  {
    title: "AI Chat",
    url: "/chat",
    icon: MessageSquare,
    testId: "link-chat",
  },
  {
    title: "Supabase",
    url: "/supabase",
    icon: Database,
    testId: "link-supabase",
  },
  {
    title: "Referrals",
    url: "/referrals",
    icon: Gift,
    testId: "link-referrals",
  },
  {
    title: "Usage",
    url: "/usage",
    icon: BarChart,
    testId: "link-usage",
  },
  {
    title: "Intent Capture",
    url: "/intent",
    icon: Target,
    testId: "link-intent",
  },
  {
    title: "Self-Healing",
    url: "/healing",
    icon: Shield,
    testId: "link-healing",
  },
  {
    title: "Approvals",
    url: "/approvals",
    icon: FileCheck,
    testId: "link-approvals",
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
    testId: "link-settings",
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="p-6">
        <Link href="/dashboard" data-testid="link-logo">
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold">Supernova</span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                  >
                    <Link href={item.url} data-testid={item.testId}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
