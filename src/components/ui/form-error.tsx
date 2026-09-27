export function FormError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
    >
      {message}
    </p>
  );
}

export function FieldError({ message }: { message: string | undefined }) {
  if (!message) return null;
  return <p className="mt-1.5 text-xs text-destructive">{message}</p>;
}
