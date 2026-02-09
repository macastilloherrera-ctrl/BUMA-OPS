import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { MaintainerCategory, Maintainer, UserProfile } from "@shared/schema";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  Search,
  Wrench,
  Building2,
  Phone,
  Mail,
  Clock,
  Star,
  Trash2,
  Edit,
  Tag,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";

interface MaintainerWithCategories extends Maintainer {
  categoryIds: string[];
}

const categorySchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
});

const maintainerSchema = z.object({
  companyName: z.string().min(1, "El nombre de la empresa es requerido"),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  phone2: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  address: z.string().optional(),
  responseTimeHours: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
  isPreferred: z.boolean().default(false),
  categoryIds: z.array(z.string()).default([]),
});

type CategoryForm = z.infer<typeof categorySchema>;
type MaintainerForm = z.infer<typeof maintainerSchema>;

export default function Maintainers() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("maintainers");
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isMaintainerDialogOpen, setIsMaintainerDialogOpen] = useState(false);
  const [editingMaintainer, setEditingMaintainer] = useState<MaintainerWithCategories | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<MaintainerCategory | null>(null);

  const { data: userProfile } = useQuery<UserProfile>({
    queryKey: ["/api/user/profile"],
  });

  const isManager = userProfile?.role === "gerente_general" || userProfile?.role === "gerente_operaciones" || userProfile?.role === "gerente_comercial";

  const { data: categories, isLoading: categoriesLoading } = useQuery<MaintainerCategory[]>({
    queryKey: ["/api/maintainers/categories"],
  });

  const { data: maintainers, isLoading: maintainersLoading } = useQuery<MaintainerWithCategories[]>({
    queryKey: ["/api/maintainers"],
  });

  const categoryForm = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "" },
  });

  const maintainerForm = useForm<MaintainerForm>({
    resolver: zodResolver(maintainerSchema),
    defaultValues: {
      companyName: "",
      contactName: "",
      phone: "",
      phone2: "",
      email: "",
      address: "",
      responseTimeHours: undefined,
      notes: "",
      isPreferred: false,
      categoryIds: [],
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (data: CategoryForm) => {
      return apiRequest("POST", "/api/maintainers/categories", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintainers/categories"] });
      setIsCategoryDialogOpen(false);
      categoryForm.reset();
      toast({ title: "Categoría creada" });
    },
    onError: () => {
      toast({ title: "Error al crear categoría", variant: "destructive" });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/maintainers/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintainers/categories"] });
      toast({ title: "Categoría eliminada" });
    },
    onError: () => {
      toast({ title: "Error al eliminar categoría", variant: "destructive" });
    },
  });

  const createMaintainerMutation = useMutation({
    mutationFn: async (data: MaintainerForm) => {
      const url = editingMaintainer ? `/api/maintainers/${editingMaintainer.id}` : "/api/maintainers";
      const method = editingMaintainer ? "PATCH" : "POST";
      return apiRequest(method, url, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintainers"] });
      setIsMaintainerDialogOpen(false);
      setEditingMaintainer(null);
      maintainerForm.reset();
      toast({ title: editingMaintainer ? "Mantenedor actualizado" : "Mantenedor creado" });
    },
    onError: () => {
      toast({ title: "Error al guardar mantenedor", variant: "destructive" });
    },
  });

  const deleteMaintainerMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/maintainers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintainers"] });
      toast({ title: "Mantenedor eliminado" });
    },
    onError: () => {
      toast({ title: "Error al eliminar mantenedor", variant: "destructive" });
    },
  });

  const handleEditMaintainer = (maintainer: MaintainerWithCategories) => {
    setEditingMaintainer(maintainer);
    maintainerForm.reset({
      companyName: maintainer.companyName,
      contactName: maintainer.contactName || "",
      phone: maintainer.phone || "",
      phone2: maintainer.phone2 || "",
      email: maintainer.email || "",
      address: maintainer.address || "",
      responseTimeHours: maintainer.responseTimeHours || undefined,
      notes: maintainer.notes || "",
      isPreferred: maintainer.isPreferred,
      categoryIds: maintainer.categoryIds,
    });
    setIsMaintainerDialogOpen(true);
  };

  const handleMaintainerDialogClose = () => {
    setIsMaintainerDialogOpen(false);
    setEditingMaintainer(null);
    maintainerForm.reset();
  };

  const handleAddMaintainerFromCategory = (category: MaintainerCategory) => {
    maintainerForm.reset({
      companyName: "",
      contactName: "",
      phone: "",
      phone2: "",
      email: "",
      address: "",
      responseTimeHours: undefined,
      notes: "",
      isPreferred: false,
      categoryIds: [category.id],
    });
    setIsMaintainerDialogOpen(true);
  };

  const filteredMaintainers = maintainers?.filter((m) =>
    m.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.contactName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryName = (categoryId: string) => {
    return categories?.find((c) => c.id === categoryId)?.name || "Desconocida";
  };

  const getMaintainersByCategory = (categoryId: string) => {
    return maintainers?.filter((m) => m.categoryIds.includes(categoryId)) || [];
  };

  const getCategoryMaintainerCount = (categoryId: string) => {
    return maintainers?.filter((m) => m.categoryIds.includes(categoryId)).length || 0;
  };

  const maintainerFormDialog = (
    <Dialog open={isMaintainerDialogOpen} onOpenChange={(open) => {
      if (!open) handleMaintainerDialogClose();
      else setIsMaintainerDialogOpen(true);
    }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {editingMaintainer ? "Editar Proveedor" : "Nuevo Proveedor"}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-4">
          <Form {...maintainerForm}>
            <form onSubmit={maintainerForm.handleSubmit((data) => createMaintainerMutation.mutate(data))} className="space-y-4">
              <FormField
                control={maintainerForm.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre Empresa *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre de la empresa" {...field} data-testid="input-company-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={maintainerForm.control}
                name="categoryIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categorías de Servicio *</FormLabel>
                    <div className="border rounded-md p-3 bg-muted/30">
                      <div className="grid grid-cols-2 gap-2">
                        {categories?.map((category) => (
                          <div key={category.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`cat-${category.id}`}
                              checked={field.value.includes(category.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  field.onChange([...field.value, category.id]);
                                } else {
                                  field.onChange(field.value.filter((id) => id !== category.id));
                                }
                              }}
                              data-testid={`checkbox-category-${category.id}`}
                            />
                            <label htmlFor={`cat-${category.id}`} className="text-sm cursor-pointer">
                              {category.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={maintainerForm.control}
                  name="contactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contacto</FormLabel>
                      <FormControl>
                        <Input placeholder="Persona de contacto" {...field} data-testid="input-contact-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={maintainerForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <Input placeholder="+56 9 1234 5678" {...field} data-testid="input-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={maintainerForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="contacto@empresa.cl" {...field} data-testid="input-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={maintainerForm.control}
                name="isPreferred"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 border rounded-md p-3 bg-muted/30">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-preferred"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        Marcar como Proveedor Preferido
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={maintainerForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Notas adicionales..." {...field} data-testid="input-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleMaintainerDialogClose}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={createMaintainerMutation.isPending}
                  data-testid="button-save-maintainer"
                >
                  {createMaintainerMutation.isPending ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );

  const MaintainerCard = ({ maintainer }: { maintainer: MaintainerWithCategories }) => (
    <Card className="hover-elevate" data-testid={`card-maintainer-${maintainer.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">{maintainer.companyName}</CardTitle>
            {maintainer.isPreferred && (
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            )}
          </div>
          {isManager && (
            <div className="flex gap-1">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleEditMaintainer(maintainer)}
                data-testid={`button-edit-maintainer-${maintainer.id}`}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => deleteMaintainerMutation.mutate(maintainer.id)}
                data-testid={`button-delete-maintainer-${maintainer.id}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {maintainer.contactName && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4 flex-shrink-0" />
            <span>{maintainer.contactName}</span>
          </div>
        )}
        {maintainer.phone && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-4 w-4 flex-shrink-0" />
            <span>{maintainer.phone}</span>
          </div>
        )}
        {maintainer.email && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{maintainer.email}</span>
          </div>
        )}
        {maintainer.categoryIds.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {maintainer.categoryIds.map((catId) => (
              <Badge key={catId} variant="secondary" className="text-xs">
                {getCategoryName(catId)}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 bg-background border-b border-border z-10 px-4 py-3 md:px-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-xl md:text-2xl font-semibold">Proveedores</h1>
        </div>

        <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setSelectedCategory(null); }} className="mt-3">
          <TabsList>
            <TabsTrigger value="maintainers" data-testid="tab-maintainers">
              <Wrench className="h-4 w-4 mr-2" />
              Empresas
            </TabsTrigger>
            <TabsTrigger value="categories" data-testid="tab-categories">
              <Tag className="h-4 w-4 mr-2" />
              Categorías
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-auto pb-20 md:pb-6 p-4 md:p-6">
        {activeTab === "maintainers" && (
          <div className="space-y-4">
            <div className="flex gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar empresas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-maintainers"
                />
              </div>
              {isManager && (
                <Button size="sm" onClick={() => setIsMaintainerDialogOpen(true)} data-testid="button-add-maintainer">
                  <Plus className="h-4 w-4 mr-1" />
                  Nueva Empresa
                </Button>
              )}
            </div>

            {maintainersLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-48 w-full" />
                ))}
              </div>
            ) : filteredMaintainers?.length === 0 ? (
              <div className="text-center py-12">
                <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No hay empresas registradas</p>
                {isManager && (
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setIsMaintainerDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar primera empresa
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredMaintainers?.map((maintainer) => (
                  <MaintainerCard key={maintainer.id} maintainer={maintainer} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "categories" && !selectedCategory && (
          <div className="space-y-4">
            {isManager && (
              <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" data-testid="button-add-category">
                    <Plus className="h-4 w-4 mr-1" />
                    Nueva Categoría
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nueva Categoría</DialogTitle>
                  </DialogHeader>
                  <Form {...categoryForm}>
                    <form onSubmit={categoryForm.handleSubmit((data) => createCategoryMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={categoryForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre *</FormLabel>
                            <FormControl>
                              <Input placeholder="Nombre de la categoría" {...field} data-testid="input-category-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsCategoryDialogOpen(false)}
                          className="flex-1"
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="submit"
                          className="flex-1"
                          disabled={createCategoryMutation.isPending}
                          data-testid="button-save-category"
                        >
                          {createCategoryMutation.isPending ? "Guardando..." : "Guardar"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            )}

            <p className="text-sm text-muted-foreground">
              Selecciona una categoria para ver las empresas asociadas
            </p>

            {categoriesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : categories?.length === 0 ? (
              <div className="text-center py-12">
                <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No hay categorias</p>
              </div>
            ) : (
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {categories?.map((category) => {
                  const count = getCategoryMaintainerCount(category.id);
                  return (
                    <Card 
                      key={category.id} 
                      className="hover-elevate cursor-pointer"
                      onClick={() => setSelectedCategory(category)}
                      data-testid={`card-category-${category.id}`}
                    >
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          <Tag className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <span className="font-medium">{category.name}</span>
                            <p className="text-xs text-muted-foreground">
                              {count} {count === 1 ? 'empresa' : 'empresas'}
                            </p>
                          </div>
                          {category.isDefault && (
                            <Badge variant="outline" className="text-xs">Por defecto</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {isManager && !category.isDefault && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteCategoryMutation.mutate(category.id);
                              }}
                              data-testid={`button-delete-category-${category.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "categories" && selectedCategory && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setSelectedCategory(null)}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Volver
              </Button>
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">{selectedCategory.name}</h2>
              </div>
              {isManager && (
                <Button 
                  size="sm" 
                  className="ml-auto"
                  onClick={() => handleAddMaintainerFromCategory(selectedCategory)}
                  data-testid="button-add-maintainer-to-category"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar Empresa
                </Button>
              )}
            </div>

            {(() => {
              const categoryMaintainers = getMaintainersByCategory(selectedCategory.id);
              
              if (categoryMaintainers.length === 0) {
                return (
                  <div className="text-center py-12">
                    <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">
                      No hay empresas en esta categoria
                    </p>
                    {isManager && (
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => handleAddMaintainerFromCategory(selectedCategory)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Agregar primera empresa
                      </Button>
                    )}
                  </div>
                );
              }

              return (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {categoryMaintainers.map((maintainer) => (
                    <MaintainerCard key={maintainer.id} maintainer={maintainer} />
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {maintainerFormDialog}
    </div>
  );
}
