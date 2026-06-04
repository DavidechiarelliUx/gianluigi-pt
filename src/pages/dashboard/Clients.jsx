import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, Plus, Send, Trash2, Users } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { DataList, DataTable, EmptyState, Modal, StatusBadge } from "../../components/app";
import { useToast } from "../../hooks/useToast";
import { apiFetch } from "../../lib/api";

const EMPTY_FORM = { fullName: "", email: "", phone: "", goal: "", notes: "" };

function clientStatus(client) {
  if (client.user?.hasPassword) return { label: "Attivo", status: "success" };
  if (client.user?.inviteToken) return { label: "Invitato", status: "warning" };
  return { label: "Da invitare", status: "archived" };
}

export default function Clients() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const clientsQuery = useQuery({
    queryKey: ["clients"],
    queryFn: () => apiFetch("/api/clients"),
  });

  const clients = useMemo(() => clientsQuery.data?.clients || [], [clientsQuery.data?.clients]);
  const selected = useMemo(
    () => clients.find((client) => client.id === selectedId) || clients[0] || null,
    [clients, selectedId]
  );

  const createClient = useMutation({
    mutationFn: (payload) => apiFetch("/api/clients", { method: "POST", body: payload }),
    onSuccess: async () => {
      setModalOpen(false);
      setForm(EMPTY_FORM);
      await qc.invalidateQueries({ queryKey: ["clients"] });
      toast({ type: "success", title: "Cliente creato" });
    },
    onError: (err) => toast({ type: "error", title: "Creazione fallita", description: err.message }),
  });

  const inviteClient = useMutation({
    mutationFn: (id) => apiFetch(`/api/clients/${id}/invite`, { method: "POST" }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["clients"] });
      toast({ type: "success", title: "Invito inviato" });
    },
    onError: (err) => toast({ type: "error", title: "Invito non inviato", description: err.message }),
  });

  const deleteClient = useMutation({
    mutationFn: (id) => apiFetch(`/api/clients/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      setSelectedId(null);
      await qc.invalidateQueries({ queryKey: ["clients"] });
      toast({ type: "success", title: "Cliente archiviato" });
    },
    onError: (err) => toast({ type: "error", title: "Archivio fallito", description: err.message }),
  });

  const submit = (event) => {
    event.preventDefault();
    createClient.mutate(form);
  };

  const columns = [
    {
      key: "fullName",
      label: "Cliente",
      render: (client) => (
        <div>
          <div className="font-semibold">{client.user.fullName}</div>
          <div className="text-xs text-text-muted">{client.user.email}</div>
        </div>
      ),
    },
    { key: "goal", label: "Obiettivo", render: (client) => client.goal || "—" },
    {
      key: "status",
      label: "Stato",
      render: (client) => {
        const status = clientStatus(client);
        return <StatusBadge status={status.status}>{status.label}</StatusBadge>;
      },
    },
    { key: "workouts", label: "Schede", render: (client) => client._count?.workouts ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-bold uppercase">Clienti</h2>
          <p className="text-sm text-text-muted">Crea atleti, invia inviti e prepara le schede.</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={18} /> Nuovo cliente
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="hidden md:block">
          <DataTable
            columns={columns}
            rows={clients}
            loading={clientsQuery.isLoading}
            error={clientsQuery.error?.message}
            onRowClick={(client) => setSelectedId(client.id)}
            empty={<EmptyState icon={Users} title="Nessun cliente" description="Crea il primo cliente per iniziare." />}
          />
        </div>

        <div className="md:hidden">
          <DataList
            items={clients}
            loading={clientsQuery.isLoading}
            error={clientsQuery.error?.message}
            onItemClick={(client) => setSelectedId(client.id)}
            empty={<EmptyState icon={Users} title="Nessun cliente" description="Crea il primo cliente per iniziare." />}
            renderItem={(client) => {
              const status = clientStatus(client);
              return (
                <div className="space-y-1">
                  <div className="font-semibold">{client.user.fullName}</div>
                  <div className="text-xs text-text-muted">{client.user.email}</div>
                  <StatusBadge status={status.status}>{status.label}</StatusBadge>
                </div>
              );
            }}
          />
        </div>

        <Card>
          {selected ? (
            <div className="space-y-4">
              <div>
                <h3 className="font-display text-lg font-bold uppercase">{selected.user.fullName}</h3>
                <p className="flex items-center gap-2 text-sm text-text-muted">
                  <Mail size={14} /> {selected.user.email}
                </p>
              </div>
              <div className="grid gap-3 text-sm">
                <div>
                  <div className="text-xs uppercase text-text-muted">Telefono</div>
                  <div>{selected.phone || "—"}</div>
                </div>
                <div>
                  <div className="text-xs uppercase text-text-muted">Obiettivo</div>
                  <div>{selected.goal || "—"}</div>
                </div>
                <div>
                  <div className="text-xs uppercase text-text-muted">Note</div>
                  <div>{selected.notes || "—"}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => inviteClient.mutate(selected.id)} disabled={inviteClient.isPending}>
                  <Send size={16} /> Invia invito
                </Button>
                <Button variant="danger" onClick={() => deleteClient.mutate(selected.id)} disabled={deleteClient.isPending}>
                  <Trash2 size={16} /> Archivia
                </Button>
              </div>
            </div>
          ) : (
            <EmptyState title="Seleziona un cliente" description="Il dettaglio apparirà qui." />
          )}
        </Card>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nuovo cliente"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Annulla</Button>
            <Button type="submit" form="client-form" disabled={createClient.isPending}>
              Crea cliente
            </Button>
          </>
        }
      >
        <form id="client-form" onSubmit={submit} className="space-y-3">
          <Input placeholder="Nome completo" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          <Input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input placeholder="Telefono" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input placeholder="Obiettivo" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} />
          <Textarea placeholder="Note operative" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </form>
      </Modal>
    </div>
  );
}
