"use client"

import * as React from "react"
import { format, parse } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface DatePickerWithInputProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  disabled?: (date: Date) => boolean;
  className?: string;
  placeholder?: string;
  maxDate?: number;
}

function isValidDate(date: unknown): date is Date {
  return date instanceof Date && !isNaN(date.getTime());
}

export function DatePickerWithInput({
  value: date,
  onChange: setDate,
  disabled,
  className,
  placeholder,
  maxDate ,
}: DatePickerWithInputProps) {
  const [open, setOpen] = React.useState(false);
  const [month, setMonth] = React.useState<Date | undefined>(date);
  const [inputValue, setInputValue] = React.useState(
    date ? format(date, "dd-MM-yyyy") : ""
  );

  React.useEffect(() => {
    setInputValue(date ? format(date, "dd-MM-yyyy") : "");
    if (date) {
      setMonth(date);
    }
  }, [date]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    if (rawVal === "") {
      if (setDate) setDate(undefined);
      setInputValue("");
      return;
    }

    const val = rawVal.replace(/[^0-9]/g, "");
    let formattedVal = val;

    if (val.length > 2) {
      formattedVal = `${val.slice(0, 2)}-${val.slice(2)}`;
    }
    if (val.length > 4) {
      formattedVal = `${val.slice(0, 2)}-${val.slice(2, 4)}-${val.slice(
        4,
        8
      )}`;
    }

    setInputValue(formattedVal);

    if (val.length === 8) {
      const newDate = parse(val, "ddMMyyyy", new Date());
      if (isValidDate(newDate)) {
        if (setDate) setDate(newDate);
        setMonth(newDate);
      }
    }
  };

  return (
    <div className={cn("relative flex w-full items-center", className)}>
      <Input
        value={inputValue}
        placeholder={placeholder || "DD-MM-YYYY"}
        className="pr-10"
        onChange={handleInputChange}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
          }
        }}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date-picker-trigger"
            variant="ghost"
            className="absolute right-2 h-7 w-7 p-0"
          >
            <CalendarIcon className="h-4 w-4" />
            <span className="sr-only">Select date</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto overflow-hidden p-0"
          align="end"
          sideOffset={10}
        >
          <Calendar
            mode="single"
            selected={date}
            disabled={disabled}
            captionLayout="dropdown"
            month={month}
            onMonthChange={setMonth}
            onSelect={(d) => {
              if (setDate) setDate(d);
              if (d) {
                setInputValue(format(d, "dd-MM-yyyy"));
              }
              setOpen(false);
            }}
            endMonth={new Date(maxDate || 2200, 12)}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
} 