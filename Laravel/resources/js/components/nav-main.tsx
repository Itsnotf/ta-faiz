import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { resolveUrl } from '@/lib/utils';
import { type NavItem, type Permission } from '@/types';
import { Link, usePage } from '@inertiajs/react';


export function NavMain({ section, items = [] }: { items: NavItem[], section?: string }) {
    const page = usePage();
    const { auth } = page.props as { auth?: { permissions?: Permission[] } };
    const userPerms = auth?.permissions?.map(p => p.name) ?? [];

    function canSee(perms?: string[]) {
        if (!perms?.length) return true;
        return perms.some(p => userPerms.includes(p));
    }

    const visibleItems = items.filter(item => canSee(item.permissions));

    // Hide entire section if no items are visible
    if (visibleItems.length === 0) return null;

    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarGroupLabel>{section}</SidebarGroupLabel>
            <SidebarMenu>
                {visibleItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                            asChild
                            isActive={page.url.startsWith(resolveUrl(item.href))}
                            tooltip={{ children: item.title }}
                        >
                            <Link href={item.href} prefetch>
                                {item.icon && <item.icon />}
                                <span>{item.title}</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
}
