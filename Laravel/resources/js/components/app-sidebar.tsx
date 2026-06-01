import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import { type NavItem } from '@/types';
import { Link } from '@inertiajs/react';
import { BookOpen, Building2, CalendarDays, ClipboardList, DoorOpen, FileText, Folder, GraduationCap, KeyIcon, LayoutGrid, Network, ScanFace, ShieldCheck, User, UserCog, Users } from 'lucide-react';
// BookOpen used in laporan section
import AppLogo from './app-logo';
import users from '@/routes/users';
import roles from '@/routes/roles';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
];

const userManagement: NavItem[] = [
    {
        title: 'Users',
        href: users.index(),
        icon: User,
        permissions: ['users index'],
    },
    {
        title: 'Roles',
        href: roles.index(),
        icon: KeyIcon,
        permissions: ['roles index'],
    },
];

const masterDataItems: NavItem[] = [
    {
        title: 'Institusi',
        href: '/institusi',
        icon: Building2,
        permissions: ['institusi index'],
    },
    {
        title: 'Jurusan',
        href: '/jurusan',
        icon: Network,
        permissions: ['jurusan index'],
    },
    {
        title: 'Prodi',
        href: '/prodi',
        icon: GraduationCap,
        permissions: ['prodi index'],
    },
    {
        title: 'Ruangan',
        href: '/ruangan',
        icon: DoorOpen,
        permissions: ['ruangan index'],
    },
    {
        title: 'Kelas',
        href: '/kelas',
        icon: Users,
        permissions: ['kelas index'],
    },
    {
        title: 'Dosen',
        href: '/dosen',
        icon: UserCog,
        permissions: ['dosen index'],
    },
    {
        title: 'Mahasiswa',
        href: '/mahasiswa',
        icon: GraduationCap,
        permissions: ['mahasiswa index'],
    },
    {
        title: 'Jadwal',
        href: '/jadwal',
        icon: CalendarDays,
        permissions: ['jadwal index'],
    },
    {
        title: 'Enrollment',
        href: '/enrollment',
        icon: ScanFace,
        permissions: ['enrollment index'],
    },
];

const absensiItems: NavItem[] = [
    {
        title: 'Rekap Absensi',
        href: '/absensi',
        icon: ClipboardList,
        permissions: ['absensi index'],
    },
];

const keteranganItems: NavItem[] = [
    {
        title: 'Keterangan Saya',
        href: '/keterangan',
        icon: FileText,
        permissions: ['keterangan create'],
    },
    {
        title: 'Keterangan Masuk',
        href: '/keterangan/admin',
        icon: ClipboardList,
        permissions: ['keterangan approve'],
    },
];

const dosenItems: NavItem[] = [
    {
        title: 'Enrollment Wajah',
        href: '/enrollment-dosen',
        icon: ScanFace,
        permissions: ['enrollment_dosen index'],
    },
    {
        title: 'Koreksi Absensi',
        href: '/koreksi-dosen',
        icon: ClipboardList,
        permissions: ['koreksi_dosen create'],
    },
    {
        title: 'Koreksi Absensi Dosen',
        href: '/koreksi-dosen/admin',
        icon: ShieldCheck,
        permissions: ['koreksi_dosen approve'],
    },
];

const laporanItems: NavItem[] = [
    {
        title: 'Laporan Kehadiran',
        href: '/laporan',
        icon: BookOpen,
        permissions: ['laporan index'],
    },
];

const footerNavItems: NavItem[] = [
    // {
    //     title: 'Repository',
    //     href: 'https://github.com/laravel/react-starter-kit',
    //     icon: Folder,
    // },
];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain section='Platform' items={mainNavItems} />
                <NavMain section='Master Data' items={masterDataItems} />
                <NavMain section='Absensi' items={absensiItems} />
                <NavMain section='Keterangan' items={keteranganItems} />
                <NavMain section='Dosen' items={dosenItems} />
                <NavMain section='Laporan' items={laporanItems} />
                <NavMain section='User Management' items={userManagement} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
