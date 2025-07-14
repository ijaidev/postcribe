import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@radix-ui/react-popover";
import {
    Command,
    CommandGroup,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "./command";
import { CommandInput, CommandEmpty } from "./command";
import { cn } from "@/lib/utils";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { Button } from "./button";
import timezones from "@/lib/timezones.json";
import * as React from "react";

export default function TimezoneSelect({
    value,
    onValueChange,
    className,
}: {
    value: string;
    onValueChange: (value: string) => void;
    className?: string;
}) {
    const [open, setOpen] = React.useState(false);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                        "bg-background/50 focus:bg-background h-12 justify-between border-2 text-left text-base font-normal transition-all duration-200",
                        className,
                    )}
                >
                    <span className="truncate">
                        {value
                            ? timezones.find(
                                  timezone =>
                                      timezone.utc?.[0] === value ||
                                      timezone.value === value,
                              )?.text
                            : "Select your timezone"}
                    </span>
                    <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="max-h-96 w-[400px] p-0" align="start">
                <Command className="[&_[data-slot=command-input-wrapper]]:h-12 [&_[data-slot=command-input]]:text-base">
                    <CommandInput placeholder="Search timezone..." />
                    <CommandSeparator className="bg-accent" />
                    <CommandList>
                        <CommandEmpty className="text-muted-foreground py-6 text-center text-sm">
                            No timezone found.
                        </CommandEmpty>
                        <CommandGroup>
                            {timezones.map((timezone, index) => {
                                const timezoneValue = timezone.utc[0];
                                return (
                                    <CommandItem
                                        key={`${timezone.value}-${index}`}
                                        value={`${timezone.text} ${timezone.value}`}
                                        className="cursor-pointer py-3 text-sm"
                                        onSelect={() => {
                                            onValueChange(timezoneValue);
                                            setOpen(false);
                                        }}
                                    >
                                        <CheckIcon
                                            className={cn(
                                                "mr-2 h-4 w-4 flex-shrink-0",
                                                value === timezoneValue
                                                    ? "opacity-100"
                                                    : "opacity-0",
                                            )}
                                        />
                                        <div className="flex min-w-0 flex-1 flex-col">
                                            <span className="truncate font-medium">
                                                {timezone.text}
                                            </span>
                                            <span className="text-muted-foreground truncate text-xs">
                                                {timezone.value}
                                            </span>
                                        </div>
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
