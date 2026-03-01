import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MessageSquare,
  Send,
  Plus,
  Trash2,
  Bot,
  User,
  Loader2,
  ChevronLeft,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChatMessage {
  id: number;
  conversationId: number;
  role: string;
  content: string;
  createdAt: string;
}

interface ChatConversation {
  id: number;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatMarkdown(text: string): string {
  const escaped = escapeHtml(text);
  let html = escaped
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm">$1</code>')
    .replace(/^### (.*$)/gm, '<h3 class="font-semibold text-base mt-3 mb-1">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="font-semibold text-lg mt-4 mb-2">$1</h2>')
    .replace(/^# (.*$)/gm, '<h1 class="font-bold text-xl mt-4 mb-2">$1</h1>')
    .replace(/^\d+\. (.*$)/gm, '<li class="ml-4 list-decimal">$1</li>')
    .replace(/^- (.*$)/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
  return html;
}

const SUGGESTED_QUESTIONS = [
  "¿Qué son los gastos comunes y cómo se calculan?",
  "¿Cómo funciona la conciliación bancaria en OPS?",
  "¿Qué dice la ley sobre las asambleas de copropietarios?",
  "¿Cómo se genera un ticket en el sistema?",
];

export default function ChatIA() {
  const [activeConversation, setActiveConversation] = useState<number | null>(null);
  const [inputMessage, setInputMessage] = useState("");
  const [showSidebar, setShowSidebar] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: conversations = [], isLoading: loadingConversations } = useQuery<ChatConversation[]>({
    queryKey: ["/api/chat/conversations"],
  });

  const { data: conversationData, isLoading: loadingMessages } = useQuery<{
    conversation: ChatConversation;
    messages: ChatMessage[];
  }>({
    queryKey: ["/api/chat/conversations", activeConversation],
    enabled: !!activeConversation,
  });

  const messages = conversationData?.messages || [];

  const sendMutation = useMutation({
    mutationFn: async (data: { conversationId: number | null; message: string }) => {
      const response = await apiRequest("POST", "/api/chat/send", data);
      return response.json();
    },
    onSuccess: (data) => {
      if (!activeConversation && data.conversationId) {
        setActiveConversation(data.conversationId);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/chat/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/conversations", data.conversationId || activeConversation] });
    },
    onError: (error: any) => {
      let description = "No se pudo enviar el mensaje. Intenta nuevamente.";
      try {
        const msg = error.message || "";
        const jsonMatch = msg.match(/\{.*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.error) description = parsed.error;
        }
      } catch {}
      toast({
        title: "Error",
        description,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/chat/conversations/${id}`);
    },
    onSuccess: () => {
      setActiveConversation(null);
      queryClient.invalidateQueries({ queryKey: ["/api/chat/conversations"] });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sendMutation.isPending]);

  useEffect(() => {
    if (activeConversation) {
      inputRef.current?.focus();
    }
  }, [activeConversation]);

  const handleSend = () => {
    const msg = inputMessage.trim();
    if (!msg || sendMutation.isPending) return;

    setInputMessage("");
    sendMutation.mutate({
      conversationId: activeConversation,
      message: msg,
    });
  };

  const handleNewConversation = () => {
    setActiveConversation(null);
    setInputMessage("");
  };

  const handleSuggestedQuestion = (question: string) => {
    setInputMessage("");
    sendMutation.mutate({
      conversationId: null,
      message: question,
    });
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden" data-testid="page-chat-ia">
      {showSidebar && (
        <div className="w-72 border-r border-border flex flex-col bg-sidebar">
          <div className="p-3 border-b border-border">
            <Button
              onClick={handleNewConversation}
              className="w-full gap-2"
              variant="outline"
              data-testid="button-new-conversation"
            >
              <Plus className="h-4 w-4" />
              Nueva conversación
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {loadingConversations ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))
              ) : conversations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-no-conversations">
                  Sin conversaciones
                </p>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer group transition-colors ${
                      activeConversation === conv.id
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50"
                    }`}
                    onClick={() => {
                      setActiveConversation(conv.id);
                      setShowSidebar(window.innerWidth > 768);
                    }}
                    data-testid={`conversation-item-${conv.id}`}
                  >
                    <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="text-sm truncate flex-1">{conv.title}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMutation.mutate(conv.id);
                      }}
                      data-testid={`button-delete-conversation-${conv.id}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b border-border p-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setShowSidebar(!showSidebar)}
            data-testid="button-toggle-sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <h1 className="font-semibold text-lg" data-testid="text-chat-title">
              Asistente OPS
            </h1>
          </div>
          <Badge variant="secondary" className="text-xs">
            <Sparkles className="h-3 w-3 mr-1" />
            Gemini IA
          </Badge>
        </div>

        <ScrollArea className="flex-1 p-4">
          {!activeConversation && messages.length === 0 && !sendMutation.isPending ? (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <div className="bg-primary/10 rounded-full p-6 mb-6">
                <Bot className="h-12 w-12 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2" data-testid="text-welcome-title">
                Asistente OPS
              </h2>
              <p className="text-muted-foreground text-center max-w-md mb-8" data-testid="text-welcome-description">
                Experto en Ley de Copropiedad Inmobiliaria, reglamentos y el sistema BUMA OPS.
                Pregúntame lo que necesites.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-lg w-full">
                {SUGGESTED_QUESTIONS.map((q, i) => (
                  <Card
                    key={i}
                    className="p-3 cursor-pointer hover:bg-accent/50 transition-colors border-dashed"
                    onClick={() => handleSuggestedQuestion(q)}
                    data-testid={`suggested-question-${i}`}
                  >
                    <p className="text-sm">{q}</p>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-4 pb-4">
              {loadingMessages ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className={`flex gap-3 ${i % 2 === 0 ? "" : "justify-end"}`}>
                    <Skeleton className="h-16 w-3/4 rounded-lg" />
                  </div>
                ))
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
                    data-testid={`message-${msg.id}`}
                  >
                    {msg.role !== "user" && (
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={`rounded-lg px-4 py-3 max-w-[80%] ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      {msg.role === "user" ? (
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <div
                          className="text-sm prose prose-sm max-w-none dark:prose-invert"
                          dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }}
                        />
                      )}
                    </div>
                    {msg.role === "user" && (
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0 mt-1">
                        <User className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                ))
              )}

              {sendMutation.isPending && (
                <div className="flex gap-3" data-testid="message-loading">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-lg px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Pensando...
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        <div className="border-t border-border p-4">
          <div className="max-w-3xl mx-auto flex gap-2">
            <Input
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Escribe tu consulta..."
              disabled={sendMutation.isPending}
              className="flex-1"
              data-testid="input-chat-message"
            />
            <Button
              onClick={handleSend}
              disabled={!inputMessage.trim() || sendMutation.isPending}
              size="icon"
              data-testid="button-send-message"
            >
              {sendMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Asistente experto en Ley 21.442, Reglamento de Copropiedad y sistema OPS
          </p>
        </div>
      </div>
    </div>
  );
}
