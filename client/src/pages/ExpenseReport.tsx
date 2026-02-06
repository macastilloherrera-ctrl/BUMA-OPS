import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, FileSpreadsheet, Building2 } from "lucide-react";
import type { Building } from "@shared/schema";

interface ExpenseItem {
  numero: number;
  edificio: string;
  fondo: string;
  subfondo: string;
  descripcion: string;
  monto: number;
  documento: string;
  fechaEgreso: string;
  proveedor: string;
  formaPago: string;
}

const months = [
  { value: "1", label: "Enero" },
  { value: "2", label: "Febrero" },
  { value: "3", label: "Marzo" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Mayo" },
  { value: "6", label: "Junio" },
  { value: "7", label: "Julio" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => ({
  value: String(currentYear - i),
  label: String(currentYear - i),
}));

export default function ExpenseReport() {
  const [selectedBuilding, setSelectedBuilding] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState<string>(String(currentYear));

  const { data: buildings, isLoading: buildingsLoading } = useQuery<Building[]>({
    queryKey: ["/api/buildings"],
  });

  const queryParams = new URLSearchParams();
  if (selectedBuilding !== "all") queryParams.set("buildingId", selectedBuilding);
  if (selectedMonth) queryParams.set("month", selectedMonth);
  if (selectedYear) queryParams.set("year", selectedYear);

  const { data: expenses, isLoading: expensesLoading } = useQuery<ExpenseItem[]>({
    queryKey: ["/api/reports/expenses", selectedBuilding, selectedMonth, selectedYear],
    queryFn: async () => {
      const res = await fetch(`/api/reports/expenses?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Error fetching expenses");
      return res.json();
    },
  });

  const handleDownloadExcel = () => {
    const params = new URLSearchParams();
    if (selectedBuilding !== "all") params.set("buildingId", selectedBuilding);
    if (selectedMonth) params.set("month", selectedMonth);
    if (selectedYear) params.set("year", selectedYear);
    
    window.location.href = `/api/reports/expenses/excel?${params.toString()}`;
  };

  const totalMonto = expenses?.reduce((sum, e) => sum + e.monto, 0) || 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 bg-background border-b border-border z-10 px-4 py-3 md:px-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-primary" />
            <h1 className="text-xl md:text-2xl font-semibold">Informe de Egresos</h1>
          </div>
          <Button 
            onClick={handleDownloadExcel} 
            disabled={!expenses || expenses.length === 0}
            data-testid="button-download-excel"
          >
            <Download className="h-4 w-4 mr-1" />
            Descargar Excel
          </Button>
        </div>
        
        <div className="mt-4 flex gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedBuilding} onValueChange={setSelectedBuilding}>
              <SelectTrigger className="w-[200px]" data-testid="select-building">
                <SelectValue placeholder="Seleccionar edificio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los edificios</SelectItem>
                {buildings?.map((building) => (
                  <SelectItem key={building.id} value={building.id}>
                    {building.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[150px]" data-testid="select-month">
              <SelectValue placeholder="Mes" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[120px]" data-testid="select-year">
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year.value} value={year.value}>
                  {year.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-auto pb-20 md:pb-6 p-4 md:p-6">
        {buildingsLoading || expensesLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Egresos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-amount">
                    {formatCurrency(totalMonto)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Cantidad de Registros
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-record-count">
                    {expenses?.length || 0}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Periodo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-period">
                    {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
                  </div>
                </CardContent>
              </Card>
            </div>

            {expenses && expenses.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Detalle de Egresos</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[60px]">N°</TableHead>
                          <TableHead>Edificio</TableHead>
                          <TableHead>Categoría</TableHead>
                          <TableHead className="max-w-[300px]">Descripción</TableHead>
                          <TableHead className="text-right">Monto</TableHead>
                          <TableHead>Documento</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Proveedor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenses.map((expense) => (
                          <TableRow key={expense.numero} data-testid={`row-expense-${expense.numero}`}>
                            <TableCell className="font-medium">{expense.numero}</TableCell>
                            <TableCell>{expense.edificio}</TableCell>
                            <TableCell>{expense.subfondo}</TableCell>
                            <TableCell className="max-w-[300px] truncate">{expense.descripcion}</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(expense.monto)}
                            </TableCell>
                            <TableCell>{expense.documento}</TableCell>
                            <TableCell>{expense.fechaEgreso}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{expense.proveedor}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No hay egresos registrados para el periodo seleccionado
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Los egresos aparecen cuando se cierran tickets con factura
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
