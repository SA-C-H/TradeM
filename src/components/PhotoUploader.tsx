import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

export interface PendingPhoto {
  file: File;
  previewUrl: string;
  kind: 'before' | 'after';
}

interface Props {
  photos: PendingPhoto[];
  onChange: (photos: PendingPhoto[]) => void;
  defaultKind?: 'before' | 'after';
}

export default function PhotoUploader({ photos, onChange, defaultKind = 'before' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<'before' | 'after'>(defaultKind);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newPhotos: PendingPhoto[] = [];
    Array.from(files).forEach(file => {
      if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name} > 10MB`); return; }
      newPhotos.push({ file, previewUrl: URL.createObjectURL(file), kind });
    });
    onChange([...photos, ...newPhotos]);
  };

  const removePhoto = (idx: number) => {
    URL.revokeObjectURL(photos[idx].previewUrl);
    onChange(photos.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex rounded-md border border-border overflow-hidden text-xs">
          <button type="button" onClick={() => setKind('before')} className={`px-3 py-1.5 ${kind === 'before' ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}>Avant</button>
          <button type="button" onClick={() => setKind('after')} className={`px-3 py-1.5 ${kind === 'after' ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}>Après</button>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} className="gap-1.5">
          <Upload className="h-3.5 w-3.5" /> Ajouter
        </Button>
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
      </div>

      {photos.length === 0 ? (
        <div className="border border-dashed border-border rounded-md p-6 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
          <ImageIcon className="h-6 w-6 opacity-50" />
          Aucune photo
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {photos.map((p, i) => (
            <div key={i} className="relative group rounded-md overflow-hidden border border-border bg-secondary aspect-square">
              <img src={p.previewUrl} alt="" className="w-full h-full object-cover" />
              <span className="absolute top-1 left-1 text-[10px] px-1.5 py-0.5 rounded bg-background/80 text-foreground">{p.kind}</span>
              <button type="button" onClick={() => removePhoto(i)} className="absolute top-1 right-1 bg-destructive/90 text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
