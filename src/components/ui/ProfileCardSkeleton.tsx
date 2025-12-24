import { Skeleton } from '@/components/ui/skeleton';

export default function ProfileCardSkeleton() {
  return (
    <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-card border border-border">
      <Skeleton className="absolute inset-0 w-full h-full" />
      
      <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-3 w-full" />
        <div className="flex gap-3 pt-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </div>
  );
}