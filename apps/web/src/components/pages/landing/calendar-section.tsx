"use client";

const CalendarSection = () => {
    return (
        <section className="flex w-full flex-col items-center justify-center">
            <h3 className="text-foreground text-3xl font-bold md:text-4xl">
                Your Content, On Autopilot.
            </h3>
            <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-center text-lg">
                Schedule posts, create recurring automations, and let Postcribe
                manage your content calendar.
            </p>
            <div className="bg-card border-border mx-auto mt-14 max-w-lg rounded-xl border p-6 shadow-lg">
                <div className="mb-4 flex items-center justify-between">
                    <p className="font-semibold">August 2025</p>
                    <div className="flex space-x-2">
                        <div className="h-3 w-3 rounded-full bg-blue-400"></div>
                        <div className="h-3 w-3 rounded-full bg-green-400"></div>
                    </div>
                </div>
                <div className="text-muted-foreground grid grid-cols-7 gap-1 text-center text-sm">
                    <div>Mo</div>
                    <div>Tu</div>
                    <div>We</div>
                    <div>Th</div>
                    <div>Fr</div>
                    <div>Sa</div>
                    <div>Su</div>
                    {Array.from({ length: 35 }).map((_, i) => {
                        const day = (i % 31) + 1;
                        // The original code skips the first 4 cells and any day > 31
                        if (day > 31 || i < 4) {
                            return (
                                <div
                                    key={i}
                                    className="relative flex h-10 w-10 items-center justify-center rounded-full"
                                ></div>
                            );
                        }
                        // Fridays: i === 11, 18, 25
                        if (i === 11 || i === 18 || i === 25) {
                            return (
                                <div
                                    key={i}
                                    className="bg-accent text-accent-foreground relative flex h-10 w-10 items-center justify-center rounded-full"
                                >
                                    {day - 4}
                                    <div className="absolute bottom-1 h-1 w-1 rounded-full bg-blue-400"></div>
                                </div>
                            );
                        }
                        return (
                            <div
                                key={i}
                                className="relative flex h-10 w-10 items-center justify-center rounded-full"
                            >
                                {day - 4}
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default CalendarSection;
