import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Ticket } from "lucide-react";
import type { Building } from "@shared/schema";
import { Link } from "wouter";

const createTicketSchema = z.object({
  buildingId: z.string().min(1, "Selecciona un edificio"),
  description: z.string().min(10, "La descripcion debe tener al menos 10 caracteres"),
  category: z.string().min(1, "Selecciona una categoria"),
  priority: z.enum(["rojo", "amarillo", "verde"]),
  responsibleType: z.enum(["ejecutivo", "proveedor", "conserjeria", "comite"]),
  responsibleName: z.string().optional(),
  dueDate: z.string().min(1, "Selecciona fecha de compromiso"),
});

type CreateTicketForm = z.infer<typeof createTicketSchema>;

const categories = [
  "Mantenimiento",
  "Seguridad",
  "Limpieza",
  "Reparacion",
  "Inspeccion",
  "Otro",
];

export default function CreateTicket() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: buildings } = useQuery<Building[]>({
    queryKey: ["/api/buildings"],
  });

  const form = useForm<CreateTicketForm>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: {
      buildingId: "",
      description: "",
      category: "",
      priority: "verde",
      responsibleType: "ejecutivo",
      responsibleName: "",
      dueDate: "",
    },
  });

  const createTicketMutation = useMutation({
    mutationFn: async (data: CreateTicketForm) => {
      return apiRequest("POST", "/api/tickets", {
        ...data,
        dueDate: new Date(data.dueDate).toISOString(),
        status: "pendiente",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      toast({
        title: "Ticket creado",
        description: "El ticket ha sido registrado exitosamente",
      });
      setLocation("/tickets");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo crear el ticket",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateTicketForm) => {
    createTicketMutation.mutate(data);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 bg-background border-b border-border z-10 px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/tickets">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Crear Ticket</h1>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto pb-20 md:pb-6 p-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Ticket className="h-4 w-4" />
                  Informacion del Ticket
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="buildingId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Edificio *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-building">
                            <SelectValue placeholder="Selecciona un edificio" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {buildings?.map((building) => (
                            <SelectItem key={building.id} value={building.id}>
                              {building.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripcion / Explicacion *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe el problema o tarea..."
                          className="min-h-24"
                          {...field}
                          data-testid="input-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue placeholder="Selecciona una categoria" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prioridad *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-priority">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="rojo">Critico (Rojo)</SelectItem>
                          <SelectItem value="amarillo">Por Vencer (Amarillo)</SelectItem>
                          <SelectItem value="verde">Al Dia (Verde)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="responsibleType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Responsable *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-responsible">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ejecutivo">Ejecutivo</SelectItem>
                          <SelectItem value="proveedor">Proveedor</SelectItem>
                          <SelectItem value="conserjeria">Conserjeria</SelectItem>
                          <SelectItem value="comite">Comite</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="responsibleName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del Responsable (opcional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nombre o empresa..."
                          {...field}
                          data-testid="input-responsible-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha Compromiso *</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          data-testid="input-due-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={createTicketMutation.isPending}
              data-testid="button-submit-ticket"
            >
              {createTicketMutation.isPending ? "Creando..." : "Crear Ticket"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
