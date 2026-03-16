export default function SkeletonCard() {
    return (
        <div className="glass-card overflow-hidden flex flex-col h-full" style={{ transform: "none" }}>
            <div className="skeleton h-48 sm:h-56 w-full shrink-0" />
            <div className="p-4 sm:p-5 flex flex-col flex-1 justify-between gap-4">
                <div className="space-y-3">
                    <div className="skeleton h-4 w-3/4 rounded-md" />
                    <div className="space-y-2">
                        <div className="skeleton h-3 w-full rounded-md" />
                        <div className="skeleton h-3 w-4/5 rounded-md" />
                    </div>
                </div>
                <div className="flex flex-col gap-3 mt-auto">
                    <div className="skeleton h-6 w-24 rounded-md" />
                    <div className="flex gap-2">
                        <div className="skeleton h-9 sm:h-10 flex-1 rounded-xl" />
                        <div className="skeleton h-9 sm:h-10 flex-1 rounded-xl" />
                    </div>
                </div>
            </div>
        </div>
    );
}
