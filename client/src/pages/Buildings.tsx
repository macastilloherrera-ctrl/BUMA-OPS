import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Building2, Plus, MapPin, User, Search, Pencil, Trash2, UserPlus, Settings2, Upload, FileText, X, Shield, AlertTriangle, Flag, Calendar } from "lucide-react";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { Building, UserProfile, BuildingStaff, BuildingFeature } from "@shared/schema";
import { Link, useSearch } from "wouter";

const staffSchema = z.object({
  fullName: z.string().min(1, "Nombre requerido"),
  role: z.string().min(1, "Cargo requerido"),
  birthDate: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
});

const featureSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  value: z.string().optional(),
});

const buildingSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  address: z.string().min(1, "La dirección es requerida"),
  region: z.string().optional(),
  commune: z.string().optional(),
  contactPhone: z.string().optional(),
  communityEmail: z.string().email("Email inválido").optional().or(z.literal("")),
  assignedExecutiveId: z.string().optional(),
  status: z.enum(["activo", "inactivo", "en_revision"]),
  departmentCount: z.coerce.number().min(0).default(0),
  elevatorCount: z.coerce.number().min(0).default(0),
  gateCount: z.coerce.number().min(0).default(0),
  extinguisherCount: z.coerce.number().min(0).default(0),
  visitorParkingCount: z.coerce.number().min(0).default(0),
  staff: z.array(staffSchema).default([]),
  features: z.array(featureSchema).default([]),
});

type BuildingForm = z.infer<typeof buildingSchema>;

interface BuildingWithExecutive extends Building {
  executiveName?: string;
}

export default function Buildings() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
  const [regulationDocumentPath, setRegulationDocumentPath] = useState<string | null>(null);
  const [regulationFileName, setRegulationFileName] = useState<string | null>(null);
  // Insurance policy states
  const [insurancePolicyPath, setInsurancePolicyPath] = useState<string | null>(null);
  const [insurancePolicyFileName, setInsurancePolicyFileName] = useState<string | null>(null);
  const [insuranceExpiryDate, setInsuranceExpiryDate] = useState<string>("");
  const [insurerName, setInsurerName] = useState<string>("");
  // Additional document states
  const [emergencyPlanPath, setEmergencyPlanPath] = useState<string | null>(null);
  const [emergencyPlanFileName, setEmergencyPlanFileName] = useState<string | null>(null);
  const [bumaContractPath, setBumaContractPath] = useState<string | null>(null);
  const [bumaContractFileName, setBumaContractFileName] = useState<string | null>(null);
  const [adminSoftwareContractPath, setAdminSoftwareContractPath] = useState<string | null>(null);
  const [adminSoftwareContractFileName, setAdminSoftwareContractFileName] = useState<string | null>(null);
  const [bumaAdminPowersPath, setBumaAdminPowersPath] = useState<string | null>(null);
  const [bumaAdminPowersFileName, setBumaAdminPowersFileName] = useState<string | null>(null);

  const { data: buildings, isLoading } = useQuery<BuildingWithExecutive[]>({
    queryKey: ["/api/buildings"],
  });

  const { data: executives } = useQuery<UserProfile[]>({
    queryKey: ["/api/users/executives"],
  });

  const form = useForm<BuildingForm>({
    resolver: zodResolver(buildingSchema),
    defaultValues: {
      name: "",
      address: "",
      region: "",
      commune: "",
      contactPhone: "",
      communityEmail: "",
      status: "activo",
      departmentCount: 0,
      elevatorCount: 0,
      gateCount: 0,
      extinguisherCount: 0,
      visitorParkingCount: 0,
      staff: [],
      features: [],
    },
  });

  const { fields: staffFields, append: appendStaff, remove: removeStaff } = useFieldArray({
    control: form.control,
    name: "staff",
  });

  const { fields: featureFields, append: appendFeature, remove: removeFeature } = useFieldArray({
    control: form.control,
    name: "features",
  });

  const { data: existingStaff } = useQuery<BuildingStaff[]>({
    queryKey: ["/api/buildings", editingBuilding?.id, "staff"],
    enabled: !!editingBuilding?.id,
  });

  const { data: existingFeatures } = useQuery<BuildingFeature[]>({
    queryKey: ["/api/buildings", editingBuilding?.id, "features"],
    enabled: !!editingBuilding?.id,
  });

  useEffect(() => {
    if (editingBuilding && existingStaff) {
      form.setValue("staff", existingStaff.map(s => ({
        fullName: s.fullName,
        role: s.role,
        birthDate: s.birthDate ? new Date(s.birthDate).toISOString().split("T")[0] : "",
        phone: s.phone || "",
        email: s.email || "",
      })));
    }
  }, [existingStaff, editingBuilding, form]);

  useEffect(() => {
    if (editingBuilding && existingFeatures) {
      form.setValue("features", existingFeatures.map(f => ({
        name: f.name,
        value: f.value || "",
      })));
    }
  }, [existingFeatures, editingBuilding, form]);

  const searchString = useSearch();
  useEffect(() => {
    if (searchString && buildings) {
      const params = new URLSearchParams(searchString);
      const editId = params.get("edit");
      if (editId) {
        const buildingToEdit = buildings.find(b => b.id === editId);
        if (buildingToEdit) {
          setEditingBuilding(buildingToEdit);
          setIsDialogOpen(true);
          window.history.replaceState({}, '', '/edificios');
        }
      }
    }
  }, [searchString, buildings]);

  const createBuildingMutation = useMutation({
    mutationFn: async (data: BuildingForm) => {
      const { staff, features, ...buildingData } = data;
      
      const { assignedExecutiveId, ...restBuildingData } = buildingData;
      const buildingPayload = {
        ...restBuildingData,
        assignedExecutiveId: assignedExecutiveId && assignedExecutiveId !== "__none__" ? assignedExecutiveId : null,
        regulationDocumentUrl: regulationDocumentPath,
        insurancePolicyUrl: insurancePolicyPath,
        insuranceExpiryDate: insuranceExpiryDate ? new Date(insuranceExpiryDate) : null,
        insurerName: insurerName || null,
        emergencyPlanUrl: emergencyPlanPath,
        bumaContractUrl: bumaContractPath,
        adminSoftwareContractUrl: adminSoftwareContractPath,
        bumaAdminPowersUrl: bumaAdminPowersPath,
      };
      
      let building: Building;
      if (editingBuilding) {
        const res = await apiRequest("PATCH", `/api/buildings/${editingBuilding.id}`, buildingPayload);
        building = await res.json();
      } else {
        const res = await apiRequest("POST", "/api/buildings", buildingPayload);
        building = await res.json();
      }

      if (building && building.id) {
        if (staff.length > 0 || editingBuilding) {
          const staffData = staff.map(s => ({
            fullName: s.fullName,
            role: s.role,
            birthDate: s.birthDate ? new Date(s.birthDate) : null,
            phone: s.phone || null,
            email: s.email || null,
          }));
          await apiRequest("PUT", `/api/buildings/${building.id}/staff`, staffData);
        }

        if (features.length > 0 || editingBuilding) {
          const featuresData = features.map(f => ({
            name: f.name,
            value: f.value || null,
          }));
          await apiRequest("PUT", `/api/buildings/${building.id}/features`, featuresData);
        }
      }

      return building;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/buildings"] });
      toast({
        title: editingBuilding ? "Edificio actualizado" : "Edificio creado",
        description: "Los cambios han sido guardados",
      });
      setIsDialogOpen(false);
      setEditingBuilding(null);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo guardar el edificio",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BuildingForm) => {
    createBuildingMutation.mutate(data);
  };

  const handleEdit = (building: Building) => {
    setEditingBuilding(building);
    setRegulationDocumentPath(building.regulationDocumentUrl || null);
    setRegulationFileName(building.regulationDocumentUrl ? "Documento existente" : null);
    // Insurance policy
    setInsurancePolicyPath(building.insurancePolicyUrl || null);
    setInsurancePolicyFileName(building.insurancePolicyUrl ? "Documento existente" : null);
    setInsuranceExpiryDate(building.insuranceExpiryDate ? new Date(building.insuranceExpiryDate).toISOString().split("T")[0] : "");
    setInsurerName(building.insurerName || "");
    // Other documents
    setEmergencyPlanPath(building.emergencyPlanUrl || null);
    setEmergencyPlanFileName(building.emergencyPlanUrl ? "Documento existente" : null);
    setBumaContractPath(building.bumaContractUrl || null);
    setBumaContractFileName(building.bumaContractUrl ? "Documento existente" : null);
    setAdminSoftwareContractPath(building.adminSoftwareContractUrl || null);
    setAdminSoftwareContractFileName(building.adminSoftwareContractUrl ? "Documento existente" : null);
    setBumaAdminPowersPath(building.bumaAdminPowersUrl || null);
    setBumaAdminPowersFileName(building.bumaAdminPowersUrl ? "Documento existente" : null);
    form.reset({
      name: building.name,
      address: building.address,
      region: building.region || "",
      commune: building.commune || "",
      contactPhone: building.contactPhone || "",
      communityEmail: building.communityEmail || "",
      assignedExecutiveId: building.assignedExecutiveId || "",
      status: building.status,
      departmentCount: building.departmentCount || 0,
      elevatorCount: building.elevatorCount || 0,
      gateCount: building.gateCount || 0,
      extinguisherCount: building.extinguisherCount || 0,
      visitorParkingCount: building.visitorParkingCount || 0,
      staff: [],
      features: [],
    });
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingBuilding(null);
    setRegulationDocumentPath(null);
    setRegulationFileName(null);
    // Reset insurance policy
    setInsurancePolicyPath(null);
    setInsurancePolicyFileName(null);
    setInsuranceExpiryDate("");
    setInsurerName("");
    // Reset other documents
    setEmergencyPlanPath(null);
    setEmergencyPlanFileName(null);
    setBumaContractPath(null);
    setBumaContractFileName(null);
    setAdminSoftwareContractPath(null);
    setAdminSoftwareContractFileName(null);
    setBumaAdminPowersPath(null);
    setBumaAdminPowersFileName(null);
    form.reset();
  };

  const filteredBuildings = buildings?.filter((b) => {
    const matchesSearch = b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "todos" || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Check if building has complete documentation
  const hasCompleteDocumentation = (building: Building): boolean => {
    return !!(
      building.regulationDocumentUrl &&
      building.insurancePolicyUrl &&
      building.emergencyPlanUrl &&
      building.bumaContractUrl &&
      building.adminSoftwareContractUrl &&
      building.bumaAdminPowersUrl
    );
  };

  // Get insurance policy traffic light
  const getInsuranceTrafficLight = (building: Building): "verde" | "amarillo" | "rojo" | null => {
    if (!building.insuranceExpiryDate) return null;
    
    // Use date-only comparison to avoid timezone issues
    const expiryDate = new Date(building.insuranceExpiryDate);
    const now = new Date();
    
    // Reset both dates to start of day for accurate comparison
    const expiryStart = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate());
    const nowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const daysRemaining = Math.floor((expiryStart.getTime() - nowStart.getTime()) / (1000 * 60 * 60 * 24));
    
    // Business rules: <15 days = red, 15-30 days = yellow, >30 days = green
    if (daysRemaining < 0) return "rojo";
    if (daysRemaining < 15) return "rojo";
    if (daysRemaining <= 30) return "amarillo";
    return "verde";
  };

  const getStatusBadge = (status: string, building?: Building) => {
    const hasComplete = building ? hasCompleteDocumentation(building) : true;
    
    if (status === "activo" && !hasComplete) {
      return <Badge variant="destructive">Activo - Doc. Incompleta</Badge>;
    }
    const config: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      activo: { label: "Activo", variant: "default" },
      inactivo: { label: "Inactivo", variant: "secondary" },
      en_revision: { label: "En Revision", variant: "outline" },
    };
    const { label, variant } = config[status] || config.activo;
    return <Badge variant={variant}>{label}</Badge>;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 bg-background border-b border-border z-10 px-4 py-3 md:px-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-xl md:text-2xl font-semibold">Edificios</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-add-building">
                <Plus className="h-4 w-4 mr-1" />
                Agregar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>
                  {editingBuilding ? "Editar Edificio" : "Nuevo Edificio"}
                </DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto pr-2" style={{ maxHeight: "calc(90vh - 120px)" }}>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Nombre del edificio"
                                {...field}
                                data-testid="input-building-name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Estado</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-status">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="activo">Activo</SelectItem>
                                <SelectItem value="inactivo">Inactivo</SelectItem>
                                <SelectItem value="en_revision">En Revision</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dirección *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Dirección completa"
                              {...field}
                              data-testid="input-building-address"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="region"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Region</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Ej: Metropolitana"
                                {...field}
                                data-testid="input-building-region"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="commune"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Comuna</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Ej: Las Condes"
                                {...field}
                                data-testid="input-building-commune"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="contactPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Teléfono de Contacto</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="+56 9 1234 5678"
                                {...field}
                                data-testid="input-building-phone"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="communityEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Comunidad</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="comunidad@edificio.cl"
                                {...field}
                                data-testid="input-building-email"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="assignedExecutiveId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Ejecutivo Asignado
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-building-executive">
                                <SelectValue placeholder="Sin ejecutivo asignado" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="__none__">Sin ejecutivo asignado</SelectItem>
                              {executives?.map((exec: any) => (
                                <SelectItem key={exec.userId} value={exec.userId} data-testid={`option-executive-${exec.userId}`}>
                                  {exec.displayName || exec.userId}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Accordion type="multiple" className="w-full" defaultValue={["counts"]}>
                      <AccordionItem value="counts">
                        <AccordionTrigger className="text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            Caracteristicas del Edificio
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                            <FormField
                              control={form.control}
                              name="departmentCount"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Departamentos</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min={0}
                                      {...field}
                                      data-testid="input-department-count"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="elevatorCount"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Ascensores</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min={0}
                                      {...field}
                                      data-testid="input-elevator-count"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="gateCount"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Portones</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min={0}
                                      {...field}
                                      data-testid="input-gate-count"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="extinguisherCount"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Extintores</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min={0}
                                      {...field}
                                      data-testid="input-extinguisher-count"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="visitorParkingCount"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Est. Visitas</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min={0}
                                      {...field}
                                      data-testid="input-visitor-parking-count"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="staff">
                        <AccordionTrigger className="text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Personal del Edificio ({staffFields.length})
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3 pt-2">
                            {staffFields.map((field, index) => (
                              <div key={field.id} className="p-3 border rounded-md space-y-2 relative">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute top-1 right-1"
                                  onClick={() => removeStaff(index)}
                                  data-testid={`button-remove-staff-${index}`}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                                <div className="grid grid-cols-2 gap-2">
                                  <FormField
                                    control={form.control}
                                    name={`staff.${index}.fullName`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-xs">Nombre Completo *</FormLabel>
                                        <FormControl>
                                          <Input
                                            placeholder="Juan Perez"
                                            {...field}
                                            data-testid={`input-staff-name-${index}`}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name={`staff.${index}.role`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-xs">Cargo *</FormLabel>
                                        <FormControl>
                                          <Input
                                            placeholder="Conserje"
                                            {...field}
                                            data-testid={`input-staff-role-${index}`}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                  <FormField
                                    control={form.control}
                                    name={`staff.${index}.birthDate`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-xs">Fecha Nacimiento</FormLabel>
                                        <FormControl>
                                          <Input
                                            type="date"
                                            {...field}
                                            data-testid={`input-staff-birthdate-${index}`}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name={`staff.${index}.phone`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-xs">Teléfono</FormLabel>
                                        <FormControl>
                                          <Input
                                            placeholder="+56912345678"
                                            {...field}
                                            data-testid={`input-staff-phone-${index}`}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name={`staff.${index}.email`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-xs">Email</FormLabel>
                                        <FormControl>
                                          <Input
                                            type="email"
                                            placeholder="email@ejemplo.com"
                                            {...field}
                                            data-testid={`input-staff-email-${index}`}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              </div>
                            ))}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => appendStaff({ fullName: "", role: "", birthDate: "", phone: "", email: "" })}
                              className="w-full"
                              data-testid="button-add-staff"
                            >
                              <UserPlus className="h-4 w-4 mr-1" />
                              Agregar Personal
                            </Button>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="features">
                        <AccordionTrigger className="text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <Settings2 className="h-4 w-4" />
                            Otras Caracteristicas ({featureFields.length})
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3 pt-2">
                            {featureFields.map((field, index) => (
                              <div key={field.id} className="flex items-end gap-2">
                                <FormField
                                  control={form.control}
                                  name={`features.${index}.name`}
                                  render={({ field }) => (
                                    <FormItem className="flex-1">
                                      <FormLabel className="text-xs">Característica</FormLabel>
                                      <FormControl>
                                        <Input
                                          placeholder="Ej: Piscina"
                                          {...field}
                                          data-testid={`input-feature-name-${index}`}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name={`features.${index}.value`}
                                  render={({ field }) => (
                                    <FormItem className="flex-1">
                                      <FormLabel className="text-xs">Valor</FormLabel>
                                      <FormControl>
                                        <Input
                                          placeholder="Ej: 1"
                                          {...field}
                                          data-testid={`input-feature-value-${index}`}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeFeature(index)}
                                  data-testid={`button-remove-feature-${index}`}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            ))}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => appendFeature({ name: "", value: "" })}
                              className="w-full"
                              data-testid="button-add-feature"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Agregar Caracteristica
                            </Button>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>

                    <Accordion type="multiple" className="w-full" defaultValue={[]}>
                      <AccordionItem value="documents">
                        <AccordionTrigger className="text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Documentación del Edificio
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4 pt-2">
                            {/* Reglamento de Copropiedad */}
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Reglamento de Copropiedad</label>
                              {regulationDocumentPath ? (
                                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm flex-1 truncate">{regulationFileName || "Documento cargado"}</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setRegulationDocumentPath(null);
                                      setRegulationFileName(null);
                                    }}
                                    data-testid="button-remove-regulation"
                                  >
                                    <X className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              ) : (
                                <ObjectUploader
                                  maxNumberOfFiles={1}
                                  maxFileSize={20 * 1024 * 1024}
                                  onGetUploadParameters={async (file) => {
                                    const res = await fetch("/api/uploads/request-url", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({
                                        name: file.name,
                                        size: file.size,
                                        contentType: file.type,
                                      }),
                                    });
                                    if (!res.ok) {
                                      toast({
                                        title: "Error",
                                        description: "No se pudo obtener URL de subida",
                                        variant: "destructive",
                                      });
                                      throw new Error("Failed to get upload URL");
                                    }
                                    const { uploadURL, objectPath } = await res.json();
                                    (file.meta as Record<string, unknown>).objectPath = objectPath;
                                    (file.meta as Record<string, unknown>).fileName = file.name;
                                    return {
                                      method: "PUT" as const,
                                      url: uploadURL,
                                      headers: { "Content-Type": file.type || "application/octet-stream" },
                                    };
                                  }}
                                  onComplete={(result) => {
                                    const file = result.successful?.[0];
                                    if (file?.meta?.objectPath) {
                                      setRegulationDocumentPath(file.meta.objectPath as string);
                                      setRegulationFileName(file.meta.fileName as string);
                                      toast({
                                        title: "Archivo cargado",
                                        description: "El reglamento se guardará al guardar el edificio",
                                      });
                                    }
                                  }}
                                  buttonClassName="w-full"
                                >
                                  <Upload className="h-4 w-4 mr-1" />
                                  Subir Reglamento de Copropiedad
                                </ObjectUploader>
                              )}
                            </div>

                            {/* Póliza de Seguro */}
                            <div className="space-y-2 p-3 border rounded-md">
                              <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4 text-primary" />
                                <label className="text-sm font-medium">Póliza de Seguro</label>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-xs text-muted-foreground">Aseguradora</label>
                                  <Input
                                    placeholder="Nombre de la aseguradora"
                                    value={insurerName}
                                    onChange={(e) => setInsurerName(e.target.value)}
                                    data-testid="input-insurer-name"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground">Fecha Vencimiento</label>
                                  <Input
                                    type="date"
                                    value={insuranceExpiryDate}
                                    onChange={(e) => setInsuranceExpiryDate(e.target.value)}
                                    data-testid="input-insurance-expiry"
                                  />
                                </div>
                              </div>
                              {insurancePolicyPath ? (
                                <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm flex-1 truncate">{insurancePolicyFileName || "Documento cargado"}</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setInsurancePolicyPath(null);
                                      setInsurancePolicyFileName(null);
                                    }}
                                    data-testid="button-remove-insurance"
                                  >
                                    <X className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              ) : (
                                <ObjectUploader
                                  maxNumberOfFiles={1}
                                  maxFileSize={20 * 1024 * 1024}
                                  onGetUploadParameters={async (file) => {
                                    const res = await fetch("/api/uploads/request-url", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({
                                        name: file.name,
                                        size: file.size,
                                        contentType: file.type,
                                      }),
                                    });
                                    if (!res.ok) throw new Error("Failed to get upload URL");
                                    const { uploadURL, objectPath } = await res.json();
                                    (file.meta as Record<string, unknown>).objectPath = objectPath;
                                    (file.meta as Record<string, unknown>).fileName = file.name;
                                    return {
                                      method: "PUT" as const,
                                      url: uploadURL,
                                      headers: { "Content-Type": file.type || "application/octet-stream" },
                                    };
                                  }}
                                  onComplete={(result) => {
                                    const file = result.successful?.[0];
                                    if (file?.meta?.objectPath) {
                                      setInsurancePolicyPath(file.meta.objectPath as string);
                                      setInsurancePolicyFileName(file.meta.fileName as string);
                                    }
                                  }}
                                  buttonClassName="w-full"
                                >
                                  <Upload className="h-4 w-4 mr-1" />
                                  Subir Póliza de Seguro
                                </ObjectUploader>
                              )}
                            </div>

                            {/* Plan de Emergencia */}
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Plan de Emergencia</label>
                              {emergencyPlanPath ? (
                                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm flex-1 truncate">{emergencyPlanFileName || "Documento cargado"}</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setEmergencyPlanPath(null);
                                      setEmergencyPlanFileName(null);
                                    }}
                                    data-testid="button-remove-emergency-plan"
                                  >
                                    <X className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              ) : (
                                <ObjectUploader
                                  maxNumberOfFiles={1}
                                  maxFileSize={20 * 1024 * 1024}
                                  onGetUploadParameters={async (file) => {
                                    const res = await fetch("/api/uploads/request-url", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({
                                        name: file.name,
                                        size: file.size,
                                        contentType: file.type,
                                      }),
                                    });
                                    if (!res.ok) throw new Error("Failed to get upload URL");
                                    const { uploadURL, objectPath } = await res.json();
                                    (file.meta as Record<string, unknown>).objectPath = objectPath;
                                    (file.meta as Record<string, unknown>).fileName = file.name;
                                    return {
                                      method: "PUT" as const,
                                      url: uploadURL,
                                      headers: { "Content-Type": file.type || "application/octet-stream" },
                                    };
                                  }}
                                  onComplete={(result) => {
                                    const file = result.successful?.[0];
                                    if (file?.meta?.objectPath) {
                                      setEmergencyPlanPath(file.meta.objectPath as string);
                                      setEmergencyPlanFileName(file.meta.fileName as string);
                                    }
                                  }}
                                  buttonClassName="w-full"
                                >
                                  <Upload className="h-4 w-4 mr-1" />
                                  Subir Plan de Emergencia
                                </ObjectUploader>
                              )}
                            </div>

                            {/* Contrato BUMA */}
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Contrato BUMA con Edificio</label>
                              {bumaContractPath ? (
                                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm flex-1 truncate">{bumaContractFileName || "Documento cargado"}</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setBumaContractPath(null);
                                      setBumaContractFileName(null);
                                    }}
                                    data-testid="button-remove-buma-contract"
                                  >
                                    <X className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              ) : (
                                <ObjectUploader
                                  maxNumberOfFiles={1}
                                  maxFileSize={20 * 1024 * 1024}
                                  onGetUploadParameters={async (file) => {
                                    const res = await fetch("/api/uploads/request-url", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({
                                        name: file.name,
                                        size: file.size,
                                        contentType: file.type,
                                      }),
                                    });
                                    if (!res.ok) throw new Error("Failed to get upload URL");
                                    const { uploadURL, objectPath } = await res.json();
                                    (file.meta as Record<string, unknown>).objectPath = objectPath;
                                    (file.meta as Record<string, unknown>).fileName = file.name;
                                    return {
                                      method: "PUT" as const,
                                      url: uploadURL,
                                      headers: { "Content-Type": file.type || "application/octet-stream" },
                                    };
                                  }}
                                  onComplete={(result) => {
                                    const file = result.successful?.[0];
                                    if (file?.meta?.objectPath) {
                                      setBumaContractPath(file.meta.objectPath as string);
                                      setBumaContractFileName(file.meta.fileName as string);
                                    }
                                  }}
                                  buttonClassName="w-full"
                                >
                                  <Upload className="h-4 w-4 mr-1" />
                                  Subir Contrato BUMA
                                </ObjectUploader>
                              )}
                            </div>

                            {/* Contrato SW Administración */}
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Contrato SW de Administración</label>
                              {adminSoftwareContractPath ? (
                                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm flex-1 truncate">{adminSoftwareContractFileName || "Documento cargado"}</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setAdminSoftwareContractPath(null);
                                      setAdminSoftwareContractFileName(null);
                                    }}
                                    data-testid="button-remove-sw-contract"
                                  >
                                    <X className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              ) : (
                                <ObjectUploader
                                  maxNumberOfFiles={1}
                                  maxFileSize={20 * 1024 * 1024}
                                  onGetUploadParameters={async (file) => {
                                    const res = await fetch("/api/uploads/request-url", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({
                                        name: file.name,
                                        size: file.size,
                                        contentType: file.type,
                                      }),
                                    });
                                    if (!res.ok) throw new Error("Failed to get upload URL");
                                    const { uploadURL, objectPath } = await res.json();
                                    (file.meta as Record<string, unknown>).objectPath = objectPath;
                                    (file.meta as Record<string, unknown>).fileName = file.name;
                                    return {
                                      method: "PUT" as const,
                                      url: uploadURL,
                                      headers: { "Content-Type": file.type || "application/octet-stream" },
                                    };
                                  }}
                                  onComplete={(result) => {
                                    const file = result.successful?.[0];
                                    if (file?.meta?.objectPath) {
                                      setAdminSoftwareContractPath(file.meta.objectPath as string);
                                      setAdminSoftwareContractFileName(file.meta.fileName as string);
                                    }
                                  }}
                                  buttonClassName="w-full"
                                >
                                  <Upload className="h-4 w-4 mr-1" />
                                  Subir Contrato SW Administración
                                </ObjectUploader>
                              )}
                            </div>

                            {/* Poderes de Administración BUMA */}
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Poderes de Administración BUMA</label>
                              {bumaAdminPowersPath ? (
                                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm flex-1 truncate">{bumaAdminPowersFileName || "Documento cargado"}</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setBumaAdminPowersPath(null);
                                      setBumaAdminPowersFileName(null);
                                    }}
                                    data-testid="button-remove-admin-powers"
                                  >
                                    <X className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              ) : (
                                <ObjectUploader
                                  maxNumberOfFiles={1}
                                  maxFileSize={20 * 1024 * 1024}
                                  onGetUploadParameters={async (file) => {
                                    const res = await fetch("/api/uploads/request-url", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({
                                        name: file.name,
                                        size: file.size,
                                        contentType: file.type,
                                      }),
                                    });
                                    if (!res.ok) throw new Error("Failed to get upload URL");
                                    const { uploadURL, objectPath } = await res.json();
                                    (file.meta as Record<string, unknown>).objectPath = objectPath;
                                    (file.meta as Record<string, unknown>).fileName = file.name;
                                    return {
                                      method: "PUT" as const,
                                      url: uploadURL,
                                      headers: { "Content-Type": file.type || "application/octet-stream" },
                                    };
                                  }}
                                  onComplete={(result) => {
                                    const file = result.successful?.[0];
                                    if (file?.meta?.objectPath) {
                                      setBumaAdminPowersPath(file.meta.objectPath as string);
                                      setBumaAdminPowersFileName(file.meta.fileName as string);
                                    }
                                  }}
                                  buttonClassName="w-full"
                                >
                                  <Upload className="h-4 w-4 mr-1" />
                                  Subir Poderes de Administración
                                </ObjectUploader>
                              )}
                            </div>

                            <p className="text-xs text-muted-foreground">
                              Los documentos son opcionales. Puede agregarlos después desde el detalle del edificio.
                            </p>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>

                    <div className="flex gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleDialogClose}
                        className="flex-1"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1"
                        disabled={createBuildingMutation.isPending}
                        data-testid="button-save-building"
                      >
                        {createBuildingMutation.isPending ? "Guardando..." : "Guardar"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="mt-3 flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar edificios..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-buildings"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="activo">Activos</SelectItem>
              <SelectItem value="inactivo">Inactivos</SelectItem>
              <SelectItem value="en_revision">En Revision</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-auto pb-20 md:pb-6 p-4 md:p-6">
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        ) : filteredBuildings?.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No hay edificios registrados</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredBuildings?.map((building) => (
              <Card
                key={building.id}
                className="hover-elevate"
                data-testid={`card-building-${building.id}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Link href={`/edificios/${building.id}`}>
                        <CardTitle className="text-lg hover:underline cursor-pointer" data-testid={`link-building-name-${building.id}`}>
                          {building.name}
                        </CardTitle>
                      </Link>
                      {!hasCompleteDocumentation(building) && (
                        <Flag 
                          className="h-4 w-4 text-destructive" 
                          aria-label="Documentación incompleta"
                          data-testid={`icon-incomplete-docs-${building.id}`}
                        />
                      )}
                    </div>
                    {getStatusBadge(building.status, building)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{building.address}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4 flex-shrink-0" />
                    <span>{building.executiveName || "Sin asignar"}</span>
                  </div>
                  {/* Insurance policy traffic light */}
                  {building.insurerName && (
                    <div className="flex items-center gap-2 text-sm">
                      <Shield className="h-4 w-4 flex-shrink-0" />
                      <span className="text-muted-foreground">{building.insurerName}</span>
                      {(() => {
                        const insuranceStatus = getInsuranceTrafficLight(building);
                        if (insuranceStatus === "rojo") {
                          return <Badge variant="destructive" className="text-xs" data-testid={`badge-insurance-expired-${building.id}`}>Póliza Vencida</Badge>;
                        } else if (insuranceStatus === "amarillo") {
                          return <Badge variant="secondary" className="text-xs" data-testid={`badge-insurance-warning-${building.id}`}>Próx. Vencer</Badge>;
                        } else if (insuranceStatus === "verde") {
                          return <Badge variant="default" className="text-xs" data-testid={`badge-insurance-valid-${building.id}`}>Vigente</Badge>;
                        }
                        return null;
                      })()}
                    </div>
                  )}
                  {(building.departmentCount || building.elevatorCount) ? (
                    <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
                      {building.departmentCount ? (
                        <Badge variant="outline" className="text-xs">{building.departmentCount} dptos</Badge>
                      ) : null}
                      {building.elevatorCount ? (
                        <Badge variant="outline" className="text-xs">{building.elevatorCount} asc</Badge>
                      ) : null}
                      {building.gateCount ? (
                        <Badge variant="outline" className="text-xs">{building.gateCount} port</Badge>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="flex gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleEdit(building);
                      }}
                      data-testid={`button-edit-${building.id}`}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Editar
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" asChild>
                      <Link href={`/equipos?building=${building.id}`}>
                        Ver Equipos
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
