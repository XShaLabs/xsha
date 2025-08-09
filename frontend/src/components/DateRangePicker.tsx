import React from "react";
import { useTranslation } from "react-i18next";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { Calendar, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface DateRange {
  startDate?: Date;
  endDate?: Date;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (dateRange: DateRange) => void;
  onReset: () => void;
  placeholder?: string;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  value,
  onChange,
  onReset,
  placeholder = "Last 7 days",
}) => {
  const { t } = useTranslation();

  const formatDateRange = () => {
    if (value.startDate && value.endDate) {
      return `${value.startDate.toLocaleDateString()} - ${value.endDate.toLocaleDateString()}`;
    } else if (value.startDate) {
      return `From ${value.startDate.toLocaleDateString()}`;
    } else if (value.endDate) {
      return `Until ${value.endDate.toLocaleDateString()}`;
    }
    return placeholder;
  };

  const hasDateRange = value.startDate || value.endDate;

  return (
    <div className="flex flex-wrap gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <Calendar className="w-4 h-4 mr-2" />
            {formatDateRange()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="start">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-sm mb-3">
                {t("adminLogs.stats.selectDateRange")}
              </h4>
              <div className="grid grid-cols-1 gap-3">
                <DatePicker
                  value={value.startDate}
                  onChange={(date) =>
                    onChange({ ...value, startDate: date })
                  }
                  label={t("adminLogs.operationLogs.filters.startDate")}
                  placeholder={t("adminLogs.stats.selectStartDate")}
                  showLabel={true}
                  className="w-full"
                  buttonClassName="w-full"
                />
                <DatePicker
                  value={value.endDate}
                  onChange={(date) =>
                    onChange({ ...value, endDate: date })
                  }
                  label={t("adminLogs.operationLogs.filters.endDate")}
                  placeholder={t("adminLogs.stats.selectEndDate")}
                  showLabel={true}
                  className="w-full"
                  buttonClassName="w-full"
                />
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      {hasDateRange && (
        <Button variant="ghost" size="sm" onClick={onReset}>
          <X className="w-4 h-4" />
          {t("common.reset")}
        </Button>
      )}
    </div>
  );
};
