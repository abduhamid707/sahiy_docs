"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarIcon, AlertCircle, CheckCircle2 } from "lucide-react";

interface DateInputProps {
  value?: string | null;
  onChange: (isoDateString: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
}

const UZ_MONTHS = [
  "",
  "yanvar",
  "fevral",
  "mart",
  "aprel",
  "may",
  "iyun",
  "iyul",
  "avgust",
  "sentabr",
  "oktabr",
  "noyabr",
  "dekabr",
];

// Convert YYYY-MM-DD or ISO string -> DD.MM.YYYY
export function toDisplayDate(isoStr?: string | null): string {
  if (!isoStr) return "";
  const clean = isoStr.split("T")[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const [y, m, d] = clean.split("-");
    return `${d}.${m}.${y}`;
  }
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(clean)) {
    return clean;
  }
  return "";
}

// Convert DD.MM.YYYY -> YYYY-MM-DD
export function toIsoDate(displayStr: string): string {
  const clean = displayStr.trim();
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(clean)) {
    const [d, m, y] = clean.split(".");
    return `${y}-${m}-${d}`;
  }
  return "";
}

export const DateInput: React.FC<DateInputProps> = ({
  value,
  onChange,
  placeholder = "KK.OO.YYYY (masalan: 20.12.2021)",
  className,
  disabled,
}) => {
  const [displayValue, setDisplayValue] = useState<string>(toDisplayDate(value));

  useEffect(() => {
    setDisplayValue(toDisplayDate(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.replace(/[^\d.]/g, "");
    const digitsOnly = input.replace(/\D/g, "");

    if (digitsOnly.length > 8) {
      return;
    }

    let formatted = "";
    if (digitsOnly.length > 0) {
      formatted = digitsOnly.slice(0, 2);
      if (digitsOnly.length >= 3) {
        formatted += "." + digitsOnly.slice(2, 4);
      }
      if (digitsOnly.length >= 5) {
        formatted += "." + digitsOnly.slice(4, 8);
      }
    }

    setDisplayValue(formatted);

    // If complete 8 digits DD.MM.YYYY
    if (formatted.length === 10) {
      const [d, m, y] = formatted.split(".");
      const day = parseInt(d, 10);
      const month = parseInt(m, 10);
      const year = parseInt(y, 10);

      if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1920 && year <= 2099) {
        const iso = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
        onChange(iso);
        return;
      }
    }

    if (formatted.length === 0) {
      onChange("");
    }
  };

  const handleNativePicker = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isoVal = e.target.value; // YYYY-MM-DD
    if (isoVal) {
      onChange(isoVal);
      setDisplayValue(toDisplayDate(isoVal));
    }
  };

  // Helper text calculation
  const getHelperFeedback = () => {
    if (!displayValue) return null;
    const parts = displayValue.split(".");
    const dStr = parts[0] || "";
    const mStr = parts[1] || "";
    const yStr = parts[2] || "";

    const day = parseInt(dStr, 10);
    const month = parseInt(mStr, 10);

    if (dStr.length === 2 && (day < 1 || day > 31)) {
      return {
        type: "error" as const,
        text: "Kun 01 dan 31 gacha bo'lishi kerak",
      };
    }

    if (mStr.length === 2 && (month < 1 || month > 12)) {
      return {
        type: "error" as const,
        text: `Oy 01 dan 12 gacha bo'lishi kerak. Eslatma: birinchi KUN (${dStr}), keyin OY yoziladi!`,
      };
    }

    if (displayValue.length === 10 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const monthName = UZ_MONTHS[month];
      return {
        type: "success" as const,
        text: `${day}-${monthName}, ${yStr}-yil`,
      };
    }

    return null;
  };

  const feedback = getHelperFeedback();

  return (
    <div className="space-y-1.5">
      <div className="relative flex items-center">
        <Input
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={10}
          className={`h-12 rounded-xl font-bold font-mono tracking-wider pr-11 ${className || ""}`}
        />
        {/* Hidden native picker with calendar button */}
        <div className="absolute right-3 top-2.5 flex items-center">
          <label className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors p-1" title="Taqvimdan tanlash">
            <CalendarIcon className="w-4 h-4" />
            <input
              type="date"
              className="sr-only"
              value={value ? value.split("T")[0] : ""}
              onChange={handleNativePicker}
              disabled={disabled}
            />
          </label>
        </div>
      </div>

      {feedback && (
        <div
          className={`flex items-center gap-1.5 text-xs font-semibold px-1 ${
            feedback.type === "error"
              ? "text-rose-600 dark:text-rose-400"
              : "text-emerald-600 dark:text-emerald-400"
          }`}
        >
          {feedback.type === "error" ? (
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}
    </div>
  );
};
