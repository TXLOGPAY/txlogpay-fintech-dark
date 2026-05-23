// Reusable file dropzone with Zod-validated uploads.
// Today: stores local DocumentRef. Tomorrow: swap the `adapter` for
// Supabase Storage upload — the consumer doesn't change.

import { useState, type ChangeEvent, type DragEvent } from "react";
import { FileCheck2, Upload, X, AlertCircle } from "lucide-react";
import { validateFile, type UploadedFile } from "@/schemas/upload.schema";

export interface FileDropzoneProps {
  label: string;
  value?: UploadedFile;
  onChange: (file: UploadedFile | undefined) => void;
  accept?: string;
  className?: string;
}

export function FileDropzone({
  label, value, onChange, accept = ".pdf,.png,.jpg,.jpeg", className = "",
}: FileDropzoneProps) {
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (f: File | undefined) => {
    setError(null);
    if (!f) return;
    const result = validateFile(f);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onChange(result.data);
  };

  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const onPick = (e: ChangeEvent<HTMLInputElement>) => handleFile(e.target.files?.[0]);

  return (
    <div className={className}>
      <label
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={
          "relative flex flex-col items-center justify-center gap-2 rounded-xl p-5 border-2 border-dashed cursor-pointer transition-all min-h-[140px] text-center " +
          (over
            ? "border-secondary bg-secondary/10"
            : value
              ? "border-success/50 bg-success/5"
              : error
                ? "border-destructive/60 bg-destructive/5"
                : "border-border hover:border-secondary/50 hover:bg-surface-container")
        }
      >
        <input type="file" className="hidden" onChange={onPick} accept={accept} />
        {value ? (
          <>
            <FileCheck2 className="h-6 w-6 text-secondary" />
            <div className="text-xs font-medium truncate max-w-full">{value.name}</div>
            <div className="font-mono text-[10px] text-muted-foreground">
              {(value.size / 1024).toFixed(1)} KB · {value.type.split("/")[1]?.toUpperCase()}
            </div>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); setError(null); onChange(undefined); }}
              className="absolute top-2 right-2 rounded-md p-1 hover:bg-surface-container-low text-muted-foreground hover:text-destructive"
              aria-label="Remover arquivo"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <>
            <Upload className="h-6 w-6 text-muted-foreground" />
            <div className="text-xs font-medium">{label}</div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              PDF · JPG · PNG · até 10MB
            </div>
          </>
        )}
      </label>
      {error && (
        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-destructive">
          <AlertCircle className="h-3 w-3" /> {error}
        </div>
      )}
    </div>
  );
}
