'use client';

import { useEffect, useMemo, useState } from 'react';
import { Clock3, Edit3, LockKeyhole, MessageSquarePlus, Play, Save, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PricingDialog } from '@/components/PricingDialog';
import { useToast } from '@/hooks/use-toast';

type StudyNote = {
    id: string;
    seconds: number;
    text: string;
    color: string;
    createdAt: number;
};

type Props = {
    videoId: string;
    getCurrentTime: () => number;
    onSeek: (seconds: number) => void;
    isPro: boolean;
};

const FREE_NOTE_LIMIT = 5;
const COLORS = ['#a855f7', '#38bdf8', '#f59e0b', '#22c55e', '#f43f5e'];

function formatTimestamp(seconds: number) {
    const safe = Math.max(0, Math.floor(seconds));
    const mins = Math.floor(safe / 60);
    const secs = safe % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function StudyNotesPanel({ videoId, getCurrentTime, onSeek, isPro }: Props) {
    const { toast } = useToast();
    const storageKey = `animref:study-notes:${videoId}`;
    const [notes, setNotes] = useState<StudyNote[]>([]);
    const [text, setText] = useState('');
    const [capturedTime, setCapturedTime] = useState(0);
    const [selectedColor, setSelectedColor] = useState(COLORS[0]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [pricingOpen, setPricingOpen] = useState(false);

    useEffect(() => {
        try {
            const stored = localStorage.getItem(storageKey);
            setNotes(stored ? JSON.parse(stored) : []);
        } catch {
            setNotes([]);
        }
    }, [storageKey]);

    const sortedNotes = useMemo(() => [...notes].sort((a, b) => a.seconds - b.seconds), [notes]);

    const persist = (next: StudyNote[]) => {
        setNotes(next);
        localStorage.setItem(storageKey, JSON.stringify(next));
    };

    const beginNote = () => {
        if (!isPro && notes.length >= FREE_NOTE_LIMIT) {
            setPricingOpen(true);
            return;
        }
        setCapturedTime(getCurrentTime());
        setEditingId('new');
        setText('');
    };

    const saveNote = () => {
        const trimmed = text.trim();
        if (!trimmed) return;

        if (editingId && editingId !== 'new') {
            persist(notes.map(note => note.id === editingId ? { ...note, text: trimmed, color: selectedColor } : note));
            toast({ title: 'Study note updated' });
        } else {
            const note: StudyNote = {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                seconds: capturedTime,
                text: trimmed,
                color: selectedColor,
                createdAt: Date.now(),
            };
            persist([...notes, note]);
            toast({ title: 'Study note saved', description: `Marker added at ${formatTimestamp(capturedTime)}` });
        }
        setEditingId(null);
        setText('');
    };

    const editNote = (note: StudyNote) => {
        setEditingId(note.id);
        setCapturedTime(note.seconds);
        setText(note.text);
        setSelectedColor(note.color);
    };

    const deleteNote = (id: string) => {
        persist(notes.filter(note => note.id !== id));
        if (editingId === id) setEditingId(null);
    };

    return (
        <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 md:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <Clock3 className="h-5 w-5 text-purple-300" />
                        <h2 className="text-lg font-bold text-white">Study Notes</h2>
                        {!isPro && <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-zinc-400">{notes.length}/{FREE_NOTE_LIMIT} free</span>}
                    </div>
                    <p className="mt-1 text-xs text-zinc-400">Capture a playback moment, record what matters, and return to it instantly.</p>
                </div>
                <Button onClick={beginNote} className="gap-2 rounded-xl bg-purple-600 text-white hover:bg-purple-500">
                    <MessageSquarePlus className="h-4 w-4" />
                    Note current moment
                </Button>
            </div>

            {editingId && (
                <div className="mt-5 rounded-2xl border border-purple-500/30 bg-purple-950/20 p-4">
                    <div className="mb-3 flex items-center justify-between">
                        <span className="font-mono text-sm font-bold text-purple-200">{formatTimestamp(capturedTime)}</span>
                        <button onClick={() => setEditingId(null)} className="text-zinc-500 hover:text-white" aria-label="Cancel note"><X className="h-4 w-4" /></button>
                    </div>
                    <Input value={text} onChange={event => setText(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') saveNote(); }} autoFocus placeholder="What should you remember about this moment?" className="border-white/10 bg-black/40" />
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex gap-2" aria-label="Marker color">
                            {COLORS.map(color => <button key={color} type="button" onClick={() => setSelectedColor(color)} className="h-5 w-5 rounded-full border-2 transition-transform hover:scale-110" style={{ backgroundColor: color, borderColor: selectedColor === color ? 'white' : 'transparent' }} aria-label={`Use ${color} marker`} />)}
                        </div>
                        <Button onClick={saveNote} disabled={!text.trim()} size="sm" className="gap-2 bg-purple-600 hover:bg-purple-500"><Save className="h-3.5 w-3.5" /> Save note</Button>
                    </div>
                </div>
            )}

            <div className="mt-5 space-y-2">
                {sortedNotes.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-white/10 px-4 py-7 text-center text-sm text-zinc-500">Pause on an important pose or movement beat, then add your first note.</div>
                ) : sortedNotes.map(note => (
                    <div key={note.id} className="group flex items-start gap-3 rounded-xl border border-white/5 bg-black/20 p-3 hover:border-white/15">
                        <button onClick={() => onSeek(note.seconds)} className="flex shrink-0 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 font-mono text-xs font-bold text-white hover:border-purple-400/50 hover:bg-purple-500/10">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: note.color }} />
                            <Play className="h-3 w-3 fill-current" />
                            {formatTimestamp(note.seconds)}
                        </button>
                        <p className="min-w-0 flex-1 pt-1 text-sm leading-relaxed text-zinc-300">{note.text}</p>
                        <div className="flex shrink-0 gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                            <button onClick={() => editNote(note)} className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white" aria-label="Edit note"><Edit3 className="h-3.5 w-3.5" /></button>
                            <button onClick={() => deleteNote(note.id)} className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-500/10 hover:text-red-300" aria-label="Delete note"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                    </div>
                ))}
            </div>

            {!isPro && notes.length > 0 && <button onClick={() => setPricingOpen(true)} className="mt-4 flex items-center gap-2 text-xs font-semibold text-purple-300 hover:text-purple-200"><LockKeyhole className="h-3.5 w-3.5" /> Upgrade for unlimited study notes</button>}
            <PricingDialog open={pricingOpen} onOpenChange={setPricingOpen} />
        </section>
    );
}
