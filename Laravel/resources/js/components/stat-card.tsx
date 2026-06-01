import { Card, CardContent } from '@/components/ui/card';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
    label: string;
    value: string | number;
    context?: string;
    accent?: 'green' | 'red' | 'blue' | 'yellow' | 'orange' | 'purple' | 'gray';
    icon?: LucideIcon;
    className?: string;
}

const accentMap = {
    green:  'border-l-green-500',
    red:    'border-l-red-500',
    blue:   'border-l-blue-500',
    yellow: 'border-l-yellow-500',
    orange: 'border-l-orange-500',
    purple: 'border-l-purple-500',
    gray:   'border-l-gray-400',
};

const valueColorMap = {
    green:  'text-green-700 dark:text-green-400',
    red:    'text-red-700 dark:text-red-400',
    blue:   'text-blue-700 dark:text-blue-400',
    yellow: 'text-yellow-700 dark:text-yellow-400',
    orange: 'text-orange-700 dark:text-orange-400',
    purple: 'text-purple-700 dark:text-purple-400',
    gray:   'text-gray-600 dark:text-gray-400',
};

export function StatCard({ label, value, context, accent = 'blue', icon: Icon, className }: StatCardProps) {
    return (
        <Card className={cn(`border-l-4 ${accentMap[accent]} overflow-hidden`, className)}>
            <CardContent className="p-4">
                <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide truncate">
                            {label}
                        </p>
                        <p className={cn('text-3xl font-bold mt-1 tabular-nums', valueColorMap[accent])}>
                            {value}
                        </p>
                        {context && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">{context}</p>
                        )}
                    </div>
                    {Icon && (
                        <Icon className="size-8 text-muted-foreground/30 shrink-0 ml-2 mt-0.5" />
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
