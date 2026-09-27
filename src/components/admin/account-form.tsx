import * as React from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { Eye, ImagePlus, Loader2, Lock, Move, ShieldCheck, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FormSection, Input, Select, Textarea } from "@/components/ui/field";
import { FieldError, FormError } from "@/components/ui/form-error";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  createAccountFn,
  getUploadSignatureFn,
  revealAccountCredentialsFn,
  updateAccountFn,
} from "@/functions/admin";
import {
  ADMIN_STATUSES,
  HIGHLIGHTS,
  IMAGE_FORMATS,
  MAX_IMAGE_BYTES,
  MAX_IMAGES,
  parsePriceToCents,
  type AccountImageInput,
  type AccountInput,
  type AdminAccountDetail,
  type AdminEditableStatus,
} from "@/lib/admin";
import { SERVERS } from "@/lib/catalog";
import { cn } from "@/lib/format";

type Credentials = { login: string; password: string; recoveryEmail: string; instructions: string };
const emptyCredentials: Credentials = {
  login: "",
  password: "",
  recoveryEmail: "",
  instructions: "",
};

const toInt = (value: string) => (value.trim() === "" ? Number.NaN : Number(value));
const priceToInput = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

export function AccountForm({ account }: { account?: AdminAccountDetail }) {
  const navigate = useNavigate();
  const router = useRouter();
  const editing = Boolean(account);
  const locked = account?.status === "RESERVED" || account?.status === "SOLD";

  const [fields, setFields] = React.useState({
    title: account?.title ?? "",
    description: account?.description ?? "",
    price: account ? priceToInput(account.priceCents) : "",
    level: account ? String(account.level) : "",
    server: account?.server ?? SERVERS[0],
    accountYear: account?.accountYear ? String(account.accountYear) : "",
    skins: String(account?.skins ?? 0),
    evolutionWeapons: String(account?.evolutionWeapons ?? 0),
    emotes: String(account?.emotes ?? 0),
    characters: String(account?.characters ?? 0),
    passes: String(account?.passes ?? 0),
    observations: account?.observations ?? "",
    adminNotes: account?.adminNotes ?? "",
  });
  const [status, setStatus] = React.useState<AdminEditableStatus>(
    account && !locked ? (account.status as AdminEditableStatus) : "DRAFT",
  );
  const [featured, setFeatured] = React.useState(account?.featured ?? false);
  const [highlights, setHighlights] = React.useState<string[]>(account?.highlights ?? []);
  const [images, setImages] = React.useState<AccountImageInput[]>(account?.images ?? []);
  const [credentials, setCredentials] = React.useState<Credentials>(emptyCredentials);
  const [revealed, setRevealed] = React.useState<Credentials | null>(null);

  const [uploading, setUploading] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);
  const [saving, setSaving] = React.useState<null | "draft" | "publish" | "save">(null);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const fileInput = React.useRef<HTMLInputElement>(null);

  const set =
    (key: keyof typeof fields) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setFields((prev) => ({ ...prev, [key]: event.target.value }));

  // ---------- Imagens (upload direto para o Cloudinary, assinado pelo servidor) ----------

  const uploadFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    const room = MAX_IMAGES - images.length;
    if (room <= 0) {
      toast.error(`Máximo de ${MAX_IMAGES} imagens.`);
      return;
    }
    const accepted = files.slice(0, room).filter((file) => {
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!(IMAGE_FORMATS as readonly string[]).includes(extension)) {
        toast.error(`${file.name}: use JPG, PNG ou WEBP.`);
        return false;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        toast.error(`${file.name}: máximo 5 MB.`);
        return false;
      }
      return true;
    });
    if (accepted.length === 0) return;

    setUploading((n) => n + accepted.length);
    try {
      const signature = await getUploadSignatureFn();
      await Promise.all(
        accepted.map(async (file) => {
          try {
            const body = new FormData();
            body.append("file", file);
            body.append("api_key", signature.apiKey);
            body.append("timestamp", String(signature.timestamp));
            body.append("signature", signature.signature);
            body.append("folder", signature.folder);
            body.append("allowed_formats", signature.allowedFormats);
            const response = await fetch(
              `https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`,
              { method: "POST", body },
            );
            const result = (await response.json()) as {
              public_id?: string;
              secure_url?: string;
              width?: number;
              height?: number;
              error?: { message: string };
            };
            if (!response.ok || !result.public_id || !result.secure_url) {
              throw new Error(result.error?.message ?? "Falha no upload");
            }
            const uploaded: AccountImageInput = {
              publicId: result.public_id,
              url: result.secure_url,
              width: result.width ?? null,
              height: result.height ?? null,
            };
            setImages((prev) => (prev.length < MAX_IMAGES ? [...prev, uploaded] : prev));
          } catch (uploadError) {
            toast.error(`${file.name}: ${(uploadError as Error).message}`);
          } finally {
            setUploading((n) => n - 1);
          }
        }),
      );
    } catch {
      setUploading((n) => Math.max(0, n - accepted.length));
      toast.error("Não foi possível preparar o upload. Tente novamente.");
    }
  };

  const remove = (index: number) => setImages((prev) => prev.filter((_, i) => i !== index));
  /** Move a imagem de `from` para a posição `to` (as outras deslizam). Posição 0 = capa. */
  const reorder = (from: number, to: number) =>
    setImages((prev) => {
      if (from === to || to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      if (!item) return prev;
      next.splice(to, 0, item);
      return next;
    });
  const makeCover = (index: number) => reorder(index, 0);
  const move = (index: number, direction: -1 | 1) => reorder(index, index + direction);

  // Arrastar miniaturas com o rato (desktop). No telemóvel ficam os botões ← ★ →.
  const [dragFrom, setDragFrom] = React.useState<number | null>(null);
  const [dragOver, setDragOver] = React.useState<number | null>(null);
  const endDrag = () => {
    setDragFrom(null);
    setDragOver(null);
  };

  // ---------- Guardar ----------

  const buildInput = (finalStatus: AdminEditableStatus): AccountInput => {
    const anyCredential = Object.values(credentials).some((value) => value.trim() !== "");
    return {
      title: fields.title,
      description: fields.description,
      priceCents: parsePriceToCents(fields.price),
      level: toInt(fields.level),
      server: fields.server as AccountInput["server"],
      accountYear: fields.accountYear.trim() ? toInt(fields.accountYear) : null,
      skins: toInt(fields.skins),
      evolutionWeapons: toInt(fields.evolutionWeapons),
      emotes: toInt(fields.emotes),
      characters: toInt(fields.characters),
      passes: toInt(fields.passes),
      highlights: highlights as AccountInput["highlights"],
      observations: fields.observations,
      adminNotes: fields.adminNotes,
      featured,
      status: finalStatus,
      images,
      credentials: anyCredential ? credentials : null,
    };
  };

  const save = async (mode: "draft" | "publish" | "save") => {
    if (uploading > 0) {
      toast.info("Aguarde o fim do upload das imagens.");
      return;
    }
    const finalStatus: AdminEditableStatus =
      mode === "draft" ? "DRAFT" : mode === "publish" ? "AVAILABLE" : status;
    setSaving(mode);
    setError(null);
    setFieldErrors({});
    try {
      const input = buildInput(finalStatus);
      const result = account
        ? await updateAccountFn({ data: { id: account.id, input } })
        : await createAccountFn({ data: input });
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      toast.success(
        editing
          ? "Conta atualizada"
          : finalStatus === "AVAILABLE"
            ? "Conta publicada"
            : "Rascunho guardado",
      );
      await router.invalidate();
      await navigate({ to: "/admin/contas" });
    } catch {
      setError("Não foi possível guardar. Verifique a ligação e tente novamente.");
    } finally {
      setSaving(null);
    }
  };

  const reveal = async () => {
    if (!account) return;
    try {
      const data = await revealAccountCredentialsFn({ data: { id: account.id } });
      if (!data) {
        toast.error("Esta conta não tem credenciais guardadas.");
        return;
      }
      setRevealed({
        login: data.login,
        password: data.password,
        recoveryEmail: data.recoveryEmail ?? "",
        instructions: data.instructions ?? "",
      });
    } catch {
      toast.error("Não foi possível obter as credenciais.");
    }
  };

  const err = (key: string) => fieldErrors[key];

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void save(editing ? "save" : "publish");
      }}
      className="grid gap-6 lg:grid-cols-2"
      noValidate
    >
      {error ? (
        <div className="lg:col-span-2">
          <FormError message={error} />
        </div>
      ) : null}

      {locked && account ? (
        <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm lg:col-span-2">
          <StatusBadge status={account.status} />
          <p className="text-muted-foreground">
            {account.status === "SOLD"
              ? "Conta vendida: o estado e o preço já não podem ser alterados."
              : "Há um checkout em curso: o estado e o preço estão bloqueados até ao fim da reserva."}
          </p>
        </div>
      ) : null}

      <FormSection title="Informações básicas" description="Dados apresentados publicamente.">
        <Field label="Título da conta" htmlFor="f-titulo">
          <Input
            id="f-titulo"
            value={fields.title}
            onChange={set("title")}
            placeholder="Conta Free Fire #128"
            maxLength={120}
          />
          <FieldError message={err("title")} />
        </Field>
        <Field label="Descrição" htmlFor="f-desc">
          <Textarea
            id="f-desc"
            value={fields.description}
            onChange={set("description")}
            placeholder="Descreva a conta..."
            maxLength={5000}
          />
          <FieldError message={err("description")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Preço (€)" htmlFor="f-preco">
            <Input
              id="f-preco"
              inputMode="decimal"
              value={fields.price}
              onChange={set("price")}
              placeholder="69,90"
              disabled={locked}
            />
            <FieldError message={err("priceCents")} />
          </Field>
          <Field label="Level" htmlFor="f-level">
            <Input
              id="f-level"
              type="number"
              min={1}
              max={100}
              value={fields.level}
              onChange={set("level")}
              placeholder="74"
            />
            <FieldError message={err("level")} />
          </Field>
          <Field label="Servidor" htmlFor="f-servidor">
            <Select id="f-servidor" value={fields.server} onChange={set("server")}>
              {SERVERS.map((server) => (
                <option key={server}>{server}</option>
              ))}
            </Select>
            <FieldError message={err("server")} />
          </Field>
          <Field label="Ano da conta" htmlFor="f-ano">
            <Input
              id="f-ano"
              type="number"
              min={2017}
              max={new Date().getFullYear()}
              value={fields.accountYear}
              onChange={set("accountYear")}
              placeholder="2020"
            />
            <FieldError message={err("accountYear")} />
          </Field>
          {editing ? (
            <Field label="Estado" htmlFor="f-status" className="sm:col-span-2">
              <Select
                id="f-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as AdminEditableStatus)}
                disabled={locked}
              >
                {ADMIN_STATUSES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted-foreground sm:col-span-2">
            <input
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
              className="size-4 accent-[oklch(0.82_0.165_78)]"
            />
            Mostrar nos destaques da página inicial
          </label>
        </div>
      </FormSection>

      <FormSection title="Características" description="Conteúdo e itens presentes na conta.">
        <div className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ["skins", "Skins", "350"],
              ["evolutionWeapons", "Armas evolutivas", "7"],
              ["emotes", "Emotes", "15"],
              ["characters", "Personagens", "28"],
              ["passes", "Passes antigos", "4"],
            ] as const
          ).map(([key, label, placeholder]) => (
            <Field key={key} label={label} htmlFor={`f-${key}`}>
              <Input
                id={`f-${key}`}
                type="number"
                min={0}
                value={fields[key]}
                onChange={set(key)}
                placeholder={placeholder}
              />
              <FieldError message={err(key)} />
            </Field>
          ))}
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Destaques</legend>
          <div className="flex flex-wrap gap-2">
            {HIGHLIGHTS.map((highlight) => {
              const active = highlights.includes(highlight);
              return (
                <button
                  key={highlight}
                  type="button"
                  onClick={() =>
                    setHighlights((prev) =>
                      active ? prev.filter((h) => h !== highlight) : [...prev, highlight],
                    )
                  }
                  className={cn(
                    "cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                    active
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                  aria-pressed={active}
                >
                  {highlight}
                </button>
              );
            })}
          </div>
        </fieldset>
        <Field
          label="Observações públicas"
          htmlFor="f-obs"
          hint="Aparecem no anúncio (ex.: conta vinculada ao Facebook)."
        >
          <Textarea
            id="f-obs"
            value={fields.observations}
            onChange={set("observations")}
            maxLength={2000}
          />
        </Field>
        <Field
          label="Notas internas"
          htmlFor="f-notas"
          hint="Só o admin vê (ex.: preço de compra, fornecedor)."
        >
          <Textarea
            id="f-notas"
            value={fields.adminNotes}
            onChange={set("adminNotes")}
            maxLength={5000}
          />
        </Field>
      </FormSection>

      <FormSection
        title="Screenshots"
        description={`A primeira é a imagem principal. Máximo ${MAX_IMAGES}, até 5 MB cada.`}
        icon={<ImagePlus className="size-5" />}
      >
        <input
          ref={fileInput}
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) void uploadFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            // Só acende para ficheiros vindos do computador, não para miniaturas.
            if (e.dataTransfer.types.includes("Files")) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void uploadFiles(e.dataTransfer.files);
          }}
          className={cn(
            "cursor-pointer rounded-xl border-2 border-dashed bg-surface/40 px-6 py-10 text-center transition-colors",
            dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
          )}
        >
          {uploading > 0 ? (
            <Loader2 className="mx-auto size-6 animate-spin text-primary" />
          ) : (
            <ImagePlus className="mx-auto size-6 text-primary" />
          )}
          <p className="mt-3 text-sm font-semibold">
            {uploading > 0
              ? `A enviar ${uploading} ${uploading === 1 ? "imagem" : "imagens"}...`
              : "Arraste screenshots ou clique para selecionar"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">JPG, PNG ou WEBP até 5 MB</p>
        </button>
        <FieldError message={err("images")} />

        {images.length ? (
          <>
            {images.length > 1 ? (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Move className="size-3.5 text-primary" />
                Arraste as imagens para mudar a ordem. A primeira é a capa do anúncio.
              </p>
            ) : null}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {images.map((image, index) => (
                <div
                  key={image.publicId}
                  draggable
                  onDragStart={(e) => {
                    setDragFrom(index);
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", String(index)); // necessário no Firefox
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = dragFrom === null ? "copy" : "move";
                    if (dragOver !== index) setDragOver(index);
                  }}
                  onDragLeave={() => setDragOver((current) => (current === index ? null : current))}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragFrom !== null) reorder(dragFrom, index);
                    else if (e.dataTransfer.files.length) void uploadFiles(e.dataTransfer.files);
                    endDrag();
                  }}
                  onDragEnd={endDrag}
                  className={cn(
                    "group relative cursor-grab overflow-hidden rounded-lg border border-border transition-all active:cursor-grabbing",
                    dragFrom === index && "opacity-40",
                    dragOver === index &&
                      dragFrom !== null &&
                      dragFrom !== index &&
                      "ring-2 ring-primary ring-offset-2 ring-offset-background",
                  )}
                >
                  <img
                    src={image.url.replace("/image/upload/", "/image/upload/f_auto,q_auto,w_400/")}
                    alt={`Screenshot ${index + 1}`}
                    loading="lazy"
                    draggable={false}
                    className="pointer-events-none aspect-[16/10] w-full object-cover select-none"
                  />
                  {index === 0 ? (
                    <span className="gold-surface absolute top-2 left-2 rounded-full px-2 py-0.5 text-[10px] font-bold">
                      Capa
                    </span>
                  ) : (
                    <span className="absolute top-2 left-2 rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {index + 1}
                    </span>
                  )}
                  {index === 0 && dragOver === 0 && dragFrom !== null && dragFrom !== 0 ? (
                    <span className="absolute inset-0 flex items-center justify-center bg-primary/25 text-xs font-bold text-foreground backdrop-blur-[1px]">
                      Largar aqui para definir como capa
                    </span>
                  ) : null}
                  <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-background/85 p-1.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                    <IconBtn label="Mover para trás" onClick={() => move(index, -1)}>
                      ←
                    </IconBtn>
                    <IconBtn label="Definir como capa" onClick={() => makeCover(index)}>
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
          </>
        ) : null}
      </FormSection>

      <FormSection
        tone="locked"
        title="Dados privados"
        description="Guardados encriptados. Só o comprador os vê, depois do pagamento confirmado."
        icon={<Lock className="size-5" />}
      >
        {account?.hasCredentials ? (
          <div className="rounded-lg border border-success/30 bg-success/10 p-3 text-sm">
            <p className="flex items-center gap-2 font-semibold text-success">
              <ShieldCheck className="size-4" /> Credenciais guardadas
            </p>
            <p className="mt-1 text-muted-foreground">
              Deixe os campos em branco para manter as atuais, ou preencha para substituir.
            </p>
            {revealed ? (
              <dl className="mt-3 space-y-1 font-mono text-xs">
                <div>
                  <dt className="inline text-muted-foreground">Login: </dt>
                  <dd className="inline">{revealed.login}</dd>
                </div>
                <div>
                  <dt className="inline text-muted-foreground">Senha: </dt>
                  <dd className="inline">{revealed.password}</dd>
                </div>
                {revealed.recoveryEmail ? (
                  <div>
                    <dt className="inline text-muted-foreground">Recuperação: </dt>
                    <dd className="inline">{revealed.recoveryEmail}</dd>
                  </div>
                ) : null}
                {revealed.instructions ? (
                  <div>
                    <dt className="inline text-muted-foreground">Instruções: </dt>
                    <dd className="inline whitespace-pre-line">{revealed.instructions}</dd>
                  </div>
                ) : null}
              </dl>
            ) : (
              <Button type="button" size="sm" variant="outline" className="mt-3" onClick={reveal}>
                <Eye className="size-4" /> Ver credenciais atuais
              </Button>
            )}
          </div>
        ) : null}
        <Field label="Login / Email da conta" htmlFor="f-login">
          <Input
            id="f-login"
            autoComplete="off"
            value={credentials.login}
            onChange={(e) => setCredentials((c) => ({ ...c, login: e.target.value }))}
            maxLength={200}
          />
          <FieldError message={err("credentials.login")} />
        </Field>
        <Field label="Senha" htmlFor="f-senha">
          <Input
            id="f-senha"
            type="password"
            autoComplete="new-password"
            value={credentials.password}
            onChange={(e) => setCredentials((c) => ({ ...c, password: e.target.value }))}
            maxLength={200}
          />
          <FieldError message={err("credentials.password")} />
        </Field>
        <Field label="Email de recuperação" htmlFor="f-rec">
          <Input
            id="f-rec"
            autoComplete="off"
            value={credentials.recoveryEmail}
            onChange={(e) => setCredentials((c) => ({ ...c, recoveryEmail: e.target.value }))}
            maxLength={254}
          />
        </Field>
        <Field label="Instruções para o comprador" htmlFor="f-extra">
          <Textarea
            id="f-extra"
            value={credentials.instructions}
            onChange={(e) => setCredentials((c) => ({ ...c, instructions: e.target.value }))}
            placeholder="Ex.: a conta está vinculada ao Google; troque a senha após o primeiro acesso."
            maxLength={2000}
          />
        </Field>
      </FormSection>

      <div className="flex flex-wrap justify-end gap-3 lg:col-span-2">
        <Button type="button" variant="ghost" onClick={() => navigate({ to: "/admin/contas" })}>
          Cancelar
        </Button>
        {editing ? (
          <Button type="submit" disabled={saving !== null}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : "Guardar alterações"}
          </Button>
        ) : (
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={saving !== null}
              onClick={() => void save("draft")}
            >
              {saving === "draft" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Guardar rascunho"
              )}
            </Button>
            <Button type="submit" disabled={saving !== null}>
              {saving === "publish" ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> A publicar...
                </>
              ) : (
                "Publicar conta"
              )}
            </Button>
          </>
        )}
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
      title={label}
      onClick={onClick}
      className="flex size-7 cursor-pointer items-center justify-center rounded-md border border-border text-xs text-muted-foreground transition-colors hover:text-primary"
    >
      {children}
    </button>
  );
}
