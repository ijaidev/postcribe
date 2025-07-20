"use client";

import * as React from "react";
import { TimePickerInput } from "./time-picker-input";
import { TimePeriodSelect } from "./period-select";
import { Period } from "./time-picker-utils";

interface TimePicker12Props {
    date: Date | undefined;
    setDate: (date: Date | undefined) => void;
}

export function TimePicker12({ date, setDate }: TimePicker12Props) {
    // Group all hooks at the top
    const hourRef = React.useRef<HTMLButtonElement>(null);
    const minuteRef = React.useRef<HTMLButtonElement>(null);
    const periodRef = React.useRef<HTMLButtonElement>(null);
    const [period, setPeriod] = React.useState<Period>(() => {
        if (!date) return "AM";
        return date.getHours() >= 12 ? "PM" : "AM";
    });

    return (
        <div className="flex items-center gap-2">
            <div className="flex items-center">
                <TimePickerInput
                    picker="12hours"
                    period={period}
                    date={date}
                    setDate={setDate}
                    ref={hourRef}
                    onRightFocus={() => minuteRef.current?.focus()}
                    className="h-12"
                />
                <span className="text-muted-foreground mx-1">:</span>
                <TimePickerInput
                    picker="minutes"
                    date={date}
                    setDate={setDate}
                    ref={minuteRef}
                    onLeftFocus={() => hourRef.current?.focus()}
                    onRightFocus={() => periodRef.current?.focus()}
                    className="h-12"
                />
            </div>
            <TimePeriodSelect
                period={period}
                setPeriod={setPeriod}
                date={date}
                setDate={setDate}
                ref={periodRef}
                onLeftFocus={() => minuteRef.current?.focus()}
                className="h-12"
            />
        </div>
    );
}
