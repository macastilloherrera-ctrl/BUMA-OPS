import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Eye,
  MessageSquare,
  Users,
  Trash2,
  Bot,
  User,
  ArrowLeft,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChatConversation {
  id: number;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  email: string;
  first_name: string;
  last_name: string;
  message_count: number;
}

interface ChatUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  conversation_count: number;
}

interface ChatMessage {
  id: number;
  conversationId: number;
  role: string;
  content: string;
  createdAt: string;
}

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}


export default function MonitoreoChat() {
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [deleteConvId, setDeleteConvId] = useState<number | null>(null);

  const usersQuery = useQuery<ChatUser[]>({
    queryKey: ["/api/chat/monitoring/users"],
  });

  const conversationsQuery = useQuery<ChatConversation[]>({
    queryKey: ["/api/chat/monitoring/conversations", selectedUserId],
    queryFn: async () => {
      const url = selectedUserId === "all"
        ? "/api/chat/monitoring/conversations"
        : `/api/chat/monitoring/conversations?userId=${selectedUserId}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Error al cargar conversaciones");
      return res.json();
    },
  });

  const messagesQuery = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat/monitoring/conversations", selectedConversation?.id, "messages"],
    queryFn: async () => {
      const res = await fetch(`/api/chat/monitoring/conversations/${selectedConversation!.id}/messages`, { credentials: "include" });
      if (!res.ok) throw new Error("Error al cargar mensajes");
      return res.json();
    },
    enabled: !!selectedConversation,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/chat/monitoring/conversations/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Conversación eliminada" });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/monitoring/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/monitoring/users"] });
      if (selectedConversation?.id === deleteConvId) {
        setSelectedConversation(null);
      }
      setDeleteConvId(null);
    },
    onError: () => {
      toast({ title: "Error al eliminar", variant: "destructive" });
    },
  });

  const users = usersQuery.data || [];
  const conversations = conversationsQuery.data || [];
  const messages = messagesQuery.data || [];

  const totalConversations = users.reduce((sum, u) => sum + Number(u.conversation_count), 0);

  return (
    <div className="p-4 md:p-6 space-y-6" data-testid="monitoreo-chat-page">
      <div className="flex items-center gap-3">
        <Eye className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold" data-testid="page-title">Monitoreo Chat IA</h1>
          <p className="text-muted-foreground text-sm">Supervisión del uso del asistente de inteligencia artificial</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold" data-testid="stat-users">{users.length}</p>
                <p className="text-sm text-muted-foreground">Usuarios con chats</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold" data-testid="stat-conversations">{totalConversations}</p>
                <p className="text-sm text-muted-foreground">Total conversaciones</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Bot className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold" data-testid="stat-filtered">{conversations.length}</p>
                <p className="text-sm text-muted-foreground">Conversaciones mostradas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="w-full md:w-80 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Filtrar por usuario</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger data-testid="select-user-filter">
                  <SelectValue placeholder="Todos los usuarios" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los usuarios</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.first_name} {u.last_name} ({u.conversation_count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Conversaciones</CardTitle>
            </CardHeader>
            <ScrollArea className="h-[500px]">
              <div className="px-4 pb-4 space-y-2">
                {conversationsQuery.isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))
                ) : conversations.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No hay conversaciones</p>
                ) : (
                  conversations.map((conv) => (
                    <div
                      key={conv.id}
                      data-testid={`conversation-item-${conv.id}`}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedConversation?.id === conv.id ? "bg-accent border-primary" : "bg-card"
                      }`}
                      onClick={() => setSelectedConversation(conv)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{conv.title || "Sin título"}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {conv.first_name} {conv.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">{conv.email}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant="secondary" className="text-xs whitespace-nowrap">
                            {Number(conv.message_count)} msgs
                          </Badge>
                          <Button
                            variant="destructive"
                            size="sm"
                            data-testid={`delete-conversation-${conv.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConvId(conv.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{formatDate(conv.updated_at)}</p>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </Card>
        </div>

        <Card className="flex-1 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              {selectedConversation ? (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 md:hidden"
                    onClick={() => setSelectedConversation(null)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <span>
                    {selectedConversation.title} — {selectedConversation.first_name} {selectedConversation.last_name} ({selectedConversation.email})
                  </span>
                </>
              ) : (
                "Selecciona una conversación para ver los mensajes"
              )}
            </CardTitle>
          </CardHeader>
          <ScrollArea className="h-[560px]">
            <div className="px-4 pb-4 space-y-4">
              {!selectedConversation ? (
                <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
                  <Eye className="h-12 w-12 mb-4 opacity-30" />
                  <p>Selecciona una conversación de la lista para revisar los mensajes</p>
                </div>
              ) : messagesQuery.isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))
              ) : messages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sin mensajes</p>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    data-testid={`message-${msg.id}`}
                    className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.role === "assistant" && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-3 text-sm ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      <p className={`text-xs mt-2 ${msg.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {formatDate(msg.createdAt)}
                      </p>
                    </div>
                    {msg.role === "user" && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </Card>
      </div>

      <AlertDialog open={deleteConvId !== null} onOpenChange={() => setDeleteConvId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar conversación?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente la conversación y todos sus mensajes. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="cancel-delete">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              data-testid="confirm-delete"
              onClick={() => deleteConvId && deleteMutation.mutate(deleteConvId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
