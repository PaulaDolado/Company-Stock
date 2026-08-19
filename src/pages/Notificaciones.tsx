import { CheckCheck, PackageSearch, ShoppingCart, Truck } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { type NotificationType } from "@/data/mock";
import { useNotificationsQuery, useMarkNotificationRead, useMarkAllNotificationsRead,} from "@/hooks/useNotifications";

const typeStyles: Record<
  NotificationType,
  { icon: typeof PackageSearch; badge: string; iconWrap: string; dot: string; unreadBg: string }
> = {
  "Solicitud de material": {
    icon: PackageSearch,
    badge: "bg-success/15 text-success ring-1 ring-success/30",
    iconWrap: "bg-success/15 text-success",
    dot: "bg-success",
    unreadBg: "bg-success/5 border-l-success",
  },
  "Solicitud de compra": {
    icon: ShoppingCart,
    badge: "bg-warning/20 text-warning-foreground ring-1 ring-warning/40",
    iconWrap: "bg-warning/20 text-warning-foreground",
    dot: "bg-warning",
    unreadBg: "bg-warning/5 border-l-warning",
  },
  "Pedido actualizado": {
    icon: Truck,
    badge: "bg-primary/10 text-primary ring-1 ring-primary/30",
    iconWrap: "bg-primary/10 text-primary",
    dot: "bg-primary",
    unreadBg: "bg-primary/5 border-l-primary",
  },
};

export default function NotificationsPage() {
  const { data: items = [], isLoading, isError } = useNotificationsQuery();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const unread = items.filter((n) => !n.leida).length;

  return (
    <AppShell
      title="Notificaciones"
      subtitle={unread > 0 ? `${unread} sin leer` : "Todo al día"}
      actions={
        <Button
          variant="outline"
          disabled={unread === 0 || markAllRead.isPending}
          onClick={() => {
            markAllRead.mutate(undefined, {
              onSuccess: () => toast.success("Todas las notificaciones marcadas como leídas"),
              onError: (e) =>
                toast.error(e instanceof Error ? e.message : "No se pudieron marcar como leídas"),
            });
          }}
        >
          <CheckCheck className="size-4" />
          Marcar todas como leídas
        </Button>
      }
    >
      <Card className="border-border/70 shadow-sm">
        <CardContent className="divide-y divide-border p-0">
          {isLoading && (
            <p className="p-4 text-sm text-muted-foreground">Cargando notificaciones…</p>
          )}
          {isError && (
            <p className="p-4 text-sm text-destructive">No se pudieron cargar las notificaciones.</p>
          )}
          {!isLoading && !isError && items.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">No tienes notificaciones.</p>
          )}
          {items.map((n) => {
            const s = typeStyles[n.tipo];
            const Icon = s.icon;
            return (
              <div
                key={n.id}
                role={n.leida ? undefined : "button"}
                tabIndex={n.leida ? undefined : 0}
                onClick={() => {
                  if (n.leida) return;
                  markRead.mutate(n.id, {
                    onError: (e) =>
                      toast.error(e instanceof Error ? e.message : "No se pudo marcar como leída"),
                  });
                }}
                onKeyDown={(e) => {
                  if (n.leida || (e.key !== "Enter" && e.key !== " ")) return;
                  e.preventDefault();
                  markRead.mutate(n.id, {
                    onError: (err) =>
                      toast.error(err instanceof Error ? err.message : "No se pudo marcar como leída"),
                  });
                }}
                className={`flex flex-wrap items-start gap-4 border-l-4 px-5 py-4 ${
                  n.leida ? "border-l-transparent" : `cursor-pointer ${s.unreadBg}`
                }`}
              >
                <span className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${s.iconWrap}`}>
                  <Icon className="size-5" />
                </span>

                <div className="min-w-56 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.badge}`}>
                      {n.tipo}
                    </span>
                    {!n.leida && (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <span className={`size-2 rounded-full ${s.dot}`} aria-hidden />
                        Sin leer
                      </span>
                    )}
                  </div>
                  <p
                    className={`mt-1.5 text-sm ${n.leida ? "text-muted-foreground" : "font-medium text-foreground"}`}
                  >
                    {n.mensaje}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{n.fecha}</p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </AppShell>
  );
}
