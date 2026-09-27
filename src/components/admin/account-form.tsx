import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ImagePlus, Loader2, Lock, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FormSection, Input, Select, Textarea } from "@/components/ui/field";
import { accountImages } from "@/mock/accounts";
import type { Account } from "@/types";

export function AccountForm({ account }: { account?: Account }) {
  const navigate = useNavigate();
  const [saving, setSaving] = React.useState(false);
  const [images, setImages] = React.useState<string[]>(account?.images ?? accountImages.slice(0, 3));

  const publish = (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success(account ? "Conta atualizada com sucesso" : "Conta publicada com sucesso");
      navigate({ to: "/admin/contas" });
    }, 1400);
  };

  const remove = (index: number) => setImages((prev) => prev.filter((_, i) => i !== index));

  const makePrimary = (index: number) =>
    setImages((prev) => {
      const current = prev[index];
      if (!current) return prev;
      return [current, ...prev.filter((_, i) => i !== index)];
    });

  const move = (index: number, direction: -1 | 1) =>
    setImages((prev) => {
      const next = [...prev];
      const target = index + direction;
      const a = next[index];
      const b = next[target];
      if (a === undefined || b === undefined) return prev;
      next[index] = b;
      next[target] = a;
      return next;
    });

  return (
    <form onSubmit={publish} className="grid gap-6 lg:grid-cols-2">
      <FormSection title="Informações básicas" description="Dados apresentados publicamente.">
        <Field label="Título da conta" htmlFor="f-titulo">
          <Input id="f-titulo" defaultValue={account?.title} placeholder="Conta Free Fire #128" />
        </Field>
        <Field label="Descrição" htmlFor="f-desc">
          <Textarea
            id="f-desc"
            defaultValue={account?.description}
            placeholder="Descreva a conta..."
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Preço (€)" htmlFor="f-preco">
            <Input id="f-preco" type="number" step="0.01" defaultValue={account?.price} placeholder="69.90" />
          </Field>
          <Field label="Level" htmlFor="f-level">
            <Input id="f-level" type="number" defaultValue={account?.level} placeholder="74" />
          </Field>
          <Field label="Servidor" htmlFor="f-servidor">
            <Select id="f-servidor" defaultValue={account?.server}>
              <option>Brasil</option>
              <option>Europa</option>
              <option>América Latina</option>
            </Select>
          </Field>
          <Field label="Ano da conta" htmlFor="f-ano">
            <Input id="f-ano" type="number" defaultValue={account?.year} placeholder="2020" />
          </Field>
          <Field label="Status" htmlFor="f-status" className="sm:col-span-2">
            <Select id="f-status" defaultValue={account?.status}>
              <option value="disponivel">Disponível</option>
              <option value="reservada">Reservada</option>
              <option value="vendida">Vendida</option>
            </Select>
          </Field>
        </div>
      </FormSection>

      <FormSection title="Características" description="Conteúdo e itens presentes na conta.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Skins" htmlFor="f-skins">
            <Input id="f-skins" type="number" defaultValue={account?.skins} placeholder="350" />
          </Field>
          <Field label="Armas evolutivas" htmlFor="f-armas">
            <Input
              id="f-armas"
              type="number"
              defaultValue={account?.evolutionWeapons}
              placeholder="7"
            />
          </Field>
          <Field label="Emotes" htmlFor="f-emotes">
            <Input id="f-emotes" type="number" defaultValue={account?.emotes} placeholder="15" />
          </Field>
          <Field label="Personagens" htmlFor="f-chars">
            <Input id="f-chars" type="number" defaultValue={account?.characters} placeholder="28" />
          </Field>
          <Field label="Passes antigos" htmlFor="f-passes" className="sm:col-span-2">
            <Input id="f-passes" type="number" defaultValue={account?.passes} placeholder="4" />
          </Field>
        </div>
        <Field label="Observações adicionais" htmlFor="f-obs">
          <Textarea id="f-obs" placeholder="Notas internas sobre a conta..." />
        </Field>
      </FormSection>

      <FormSection
        title="Screenshots"
        description="Arraste screenshots ou clique para selecionar."
        icon={<ImagePlus className="size-5" />}
      >
        <button
          type="button"
          onClick={() => toast.info("Upload simulado — apenas interface")}
          className="cursor-pointer rounded-xl border-2 border-dashed border-border bg-surface/40 px-6 py-10 text-center transition-colors hover:border-primary/50"
        >
          <ImagePlus className="mx-auto size-6 text-primary" />
          <p className="mt-3 text-sm font-semibold">
            Arraste screenshots ou clique para selecionar
          </p>
          <p className="mt-1 text-xs text-muted-foreground">PNG ou JPG até 5 MB (simulado)</p>
        </button>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((image, index) => (
            <div key={`${image}-${index}`} className="group relative overflow-hidden rounded-lg border border-border">
              <img
                src={image}
                alt={`Screenshot ${index + 1}`}
                loading="lazy"
                width={1024}
                height={640}
                className="aspect-[16/10] w-full object-cover"
              />
              {index === 0 ? (
                <span className="gold-surface absolute top-2 left-2 rounded-full px-2 py-0.5 text-[10px] font-bold">
                  Principal
                </span>
              ) : null}
              <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-background/85 p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                <IconBtn label="Mover para trás" onClick={() => move(index, -1)}>
                  ←
                </IconBtn>
                <IconBtn label="Definir como principal" onClick={() => makePrimary(index)}>
                  <Star className="size-3.5" />
                </IconBtn>
                <IconBtn label="Mover para a frente" onClick={() => move(index, 1)}>
                  →
                </IconBtn>
                <IconBtn label="Excluir imagem" onClick={() => remove(index)}>
                  <Trash2 className="size-3.5" />
                </IconBtn>
              </div>
            </div>
          ))}
        </div>
      </FormSection>

      <FormSection
        tone="locked"
        title="Dados privados"
        description="Estas informações não são exibidas publicamente."
        icon={<Lock className="size-5" />}
      >
        <Field label="Login / Email da conta" htmlFor="f-login">
          <Input id="f-login" placeholder="demo-account@example.test" />
        </Field>
        <Field label="Senha" htmlFor="f-senha">
          <Input id="f-senha" type="password" placeholder="DemoPassword123" />
        </Field>
        <Field label="Email de recuperação" htmlFor="f-rec">
          <Input id="f-rec" placeholder="demo-recovery@example.test" />
        </Field>
        <Field label="Informações adicionais" htmlFor="f-extra">
          <Textarea id="f-extra" placeholder="Notas privadas..." />
        </Field>
      </FormSection>

      <div className="flex flex-wrap justify-end gap-3 lg:col-span-2">
        <Button type="button" variant="ghost" onClick={() => navigate({ to: "/admin/contas" })}>
          Cancelar
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => toast.success("Rascunho salvo")}
        >
          Salvar rascunho
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin" /> A publicar...
            </>
          ) : account ? (
            "Salvar alterações"
          ) : (
            "Publicar conta"
          )}
        </Button>
      </div>
    </form>
  );
}

function IconBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-7 cursor-pointer items-center justify-center rounded-md border border-border text-xs text-muted-foreground transition-colors hover:text-primary"
    >
      {children}
    </button>
  );
}
