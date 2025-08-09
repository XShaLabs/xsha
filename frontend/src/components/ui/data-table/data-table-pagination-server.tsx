import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useTranslation } from "react-i18next";

interface DataTablePaginationServerProps {
  currentPage: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function DataTablePaginationServer({
  currentPage,
  totalPages,
  total,
  onPageChange,
}: DataTablePaginationServerProps) {
  const { t } = useTranslation();



  return (
    <div className="flex items-center justify-between px-2">
      <div className="text-sm text-muted-foreground">
        {t("common.total")} {total} {t("common.items")}
      </div>
      <div className="flex items-center space-x-2">
        <div className="text-sm text-muted-foreground">
          {t("common.page")} {currentPage} / {totalPages}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          title={t("common.goToFirstPage")}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          title={t("common.goToPreviousPage")}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          title={t("common.goToNextPage")}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          title={t("common.goToLastPage")}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
