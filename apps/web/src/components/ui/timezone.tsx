import { Popover, PopoverContent, PopoverTrigger } from "@radix-ui/react-popover"
import { Command, CommandGroup, CommandItem, CommandList, CommandSeparator } from "./command"
import { CommandInput, CommandEmpty } from "./command"
import { cn } from "@/lib/utils"
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react"
import { Button } from "./button"
import timezones from "@/lib/timezones.json"
import * as React from "react"

export default function TimezoneSelect({ value, onValueChange, className }: {
    value: string
    onValueChange: (value: string) => void
    className?: string
  }) {
    const [open, setOpen] = React.useState(false)
  
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("h-12 text-base bg-background/50 border-2 focus:bg-background transition-all duration-200 justify-between text-left font-normal", className)}
          >
            <span className="truncate">
              {value
                ? timezones.find((timezone) => timezone.utc?.[0] === value || timezone.value === value)?.text
                : "Select your timezone"}
            </span>
            <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0 max-h-96" align="start">
          <Command className="[&_[data-slot=command-input-wrapper]]:h-12 [&_[data-slot=command-input]]:text-base">
            <CommandInput placeholder="Search timezone..." />
            <CommandSeparator className="bg-accent"/>
            <CommandList>
              <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                No timezone found.
              </CommandEmpty>
              <CommandGroup>
                {timezones.map((timezone, index) => {
                  const timezoneValue = timezone.utc[0]
                  return (
                    <CommandItem
                      key={`${timezone.value}-${index}`}
                      value={`${timezone.text} ${timezone.value}`}
                      className="text-sm py-3 cursor-pointer"
                      onSelect={() => {
                        onValueChange(timezoneValue)
                        setOpen(false)
                      }}
                    >
                      <CheckIcon
                        className={cn(
                          "mr-2 h-4 w-4 flex-shrink-0",
                          value === timezoneValue ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="font-medium truncate">{timezone.text}</span>
                        <span className="text-xs text-muted-foreground truncate">{timezone.value}</span>
                      </div>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    )
  }
