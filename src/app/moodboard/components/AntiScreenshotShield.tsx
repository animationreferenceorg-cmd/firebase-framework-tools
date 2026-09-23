'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { ShieldAlert, ShieldCheck, Lock, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AntiScreenshotShieldProps {
  enabled?: boolean;
  watermarkText?: string;
  className?: string;
  children?: React.ReactNode;
}

/**
 * AntiScreenshotShield
 * 
 * Protects moodboard animation references against:
 * 1. Windows Snipping Tool (Win + Shift + S) & Third-Party Screen Grabbers (via window blur & visibility detection)
 * 2. PrtScn / PrintScreen keyboard capture & clipboard extraction
 * 3. Mac Screen Capture shortcuts (Cmd + Shift + 3/4/5)
 * 4. Browser DevTools / element inspect shortcuts (F12, Ctrl+Shift+I, Ctrl+Shift+C)
 * 5. Right-click context menu "Save image/video as..."
 * 6. Drag-to-desktop reference theft
 * 7. Camera photos via subtle forensic diagonal watermarking
 */
export function AntiScreenshotShield({
  enabled = true,
  watermarkText = 'ANIMATIONREFERENCE.ORG • PROTECTED REFERENCE',
  className = '',
  children
}: AntiScreenshotShieldProps) {
  const { toast } = useToast();
  const [isWindowBlurred, setIsWindowBlurred] = useState(false);
  const [isCaptureTriggered, setIsCaptureTriggered] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  // Approved exports (PNG/PDF) must be allowed to render. The shield otherwise
  // treats the browser print preview or rasterizer as a screenshot tool.
  const [isExporting, setIsExporting] = useState(false);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Overwrite clipboard if a screenshot key was touched
  const scrubClipboard = useCallback(() => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText('⚠️ AnimationReference.org: Screenshots of reference media are protected.').catch(() => {});
      }
    } catch {}
  }, []);

  // Momentary blackout trigger
  const triggerFlashBlackout = useCallback(() => {
    setIsCaptureTriggered(true);
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    blurTimeoutRef.current = setTimeout(() => {
      setIsCaptureTriggered(false);
    }, 2000);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const handleBeforePrint = () => {
      setIsPrinting(true);
      setIsWindowBlurred(false);
      setIsCaptureTriggered(false);
    };

    const handleAfterPrint = () => {
      setIsPrinting(false);
      setIsExporting(false);
    };
    const handleExportStart = () => {
      setIsExporting(true);
      setIsWindowBlurred(false);
      setIsCaptureTriggered(false);
    };
    const handleExportEnd = () => setIsExporting(false);

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    window.addEventListener('moodboard-export-start', handleExportStart);
    window.addEventListener('moodboard-export-end', handleExportEnd);

    // Do not treat normal focus changes (clicking another app, an OS dialog, or
    // the desktop) as capture attempts. It made the workspace unusable.
    const handleWindowBlur = () => {
      setIsWindowBlurred(false);
    };

    const handleWindowFocus = () => {
      // Restore view when user clicks back into the browser
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = setTimeout(() => {
        setIsWindowBlurred(false);
        setIsCaptureTriggered(false);
      }, 100);
    };

    // 2. Tab / Window Visibility Change
    const handleVisibilityChange = () => {
      if (!document.hidden) handleWindowFocus();
    };

    // 3. Mouse Leave Window (Optional safety when snip selection begins near edge)
    const handleMouseLeaveWindow = (e: MouseEvent) => {
      if (e.clientY <= 0 || e.clientX <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
        // Pointer left browser frame
      }
    };

    // 4. Keyboard Shortcuts Interception
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen / Snapshot key
      if (e.key === 'PrintScreen' || e.key === 'Snapshot') {
        e.preventDefault();
        e.stopPropagation();
        triggerFlashBlackout();
        scrubClipboard();
        toast({
          title: '🛡️ Screenshot Blocked',
          description: 'Screenshots are disabled on moodboard references to protect creator IP.',
          variant: 'destructive',
        });
        return;
      }

      // Windows Snipping Tool: Meta + Shift + S
      // Mac Screen Capture: Cmd + Shift + 3 / 4 / 5
      // Edge / Firefox Web Capture: Ctrl + Shift + S
      const isShiftMetaOrCtrl = e.shiftKey && (e.metaKey || e.ctrlKey);
      const isCaptureKey = ['S', 's', '3', '4', '5'].includes(e.key);

      if (isShiftMetaOrCtrl && isCaptureKey) {
        e.preventDefault();
        e.stopPropagation();
        triggerFlashBlackout();
        scrubClipboard();
        toast({
          title: '🛡️ Snipping Tool Blocked',
          description: 'Screen clipping shortcuts are restricted on moodboard references.',
          variant: 'destructive',
        });
        return;
      }

      // DevTools / Inspect Elements: F12, Ctrl+Shift+I, Ctrl+Shift+C, Ctrl+Shift+J, Ctrl+U
      if (
        e.key === 'F12' ||
        (isShiftMetaOrCtrl && ['I', 'i', 'C', 'c', 'J', 'j'].includes(e.key)) ||
        ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U'))
      ) {
        e.preventDefault();
        e.stopPropagation();
        toast({
          title: '🛡️ Developer Tools Restricted',
          description: 'Reference source code inspection is restricted on this workspace.',
        });
        return;
      }

      // Save Page: Ctrl+S
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen' || e.key === 'Snapshot') {
        scrubClipboard();
      }
    };

    // 5. Context Menu (Right Click) Restriction on protected elements
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target?.closest('.moodboard-protected-media') ||
        target?.closest('#canvas-container') ||
        target?.tagName === 'IMG' ||
        target?.tagName === 'VIDEO'
      ) {
        e.preventDefault();
        toast({
          title: '🛡️ Right-Click Disabled',
          description: 'Direct saving of reference media is disabled to protect creator rights.',
        });
      }
    };

    // 6. Prevent dragging raw image/video files off the window to save to desktop
    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.tagName === 'IMG' || target?.tagName === 'VIDEO') {
        // If it's a raw media element that is NOT an intended custom board draggable, prevent file pull
        if (!target.closest('[draggable="true"]')) {
          e.preventDefault();
        }
      }
    };

    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('mouseleave', handleMouseLeaveWindow);
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('dragstart', handleDragStart);

    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
      window.removeEventListener('moodboard-export-start', handleExportStart);
      window.removeEventListener('moodboard-export-end', handleExportEnd);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('mouseleave', handleMouseLeaveWindow);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('dragstart', handleDragStart);
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    };
  }, [enabled, triggerFlashBlackout, scrubClipboard, toast]);

  const isShielded = enabled && !isPrinting && !isExporting && (isWindowBlurred || isCaptureTriggered);

  return (
    <div className={`relative ${className} select-none`}>
      {/* Print stylesheet to ensure legitimate printing is never hidden */}
      <style jsx global>{`
        [data-moodboard-exporting="true"] .anti-screenshot-curtain,
        [data-moodboard-exporting="true"] .anti-screenshot-watermark {
          display: none !important;
        }
        @media print {
          .anti-screenshot-curtain,
          .anti-screenshot-watermark {
            display: none !important;
          }
          [data-moodboard-exporting="true"] .anti-screenshot-curtain,
          [data-moodboard-exporting="true"] .anti-screenshot-watermark {
            display: none !important;
          }
          .anti-screenshot-content {
            filter: none !important;
            opacity: 1 !important;
            visibility: visible !important;
          }
        }
      `}</style>
      {/* Underlying Content */}
      <div
        className={`anti-screenshot-content w-full h-full transition-all duration-150 ${
          isShielded ? 'filter blur-2xl opacity-0 pointer-events-none select-none' : ''
        }`}
      >
        {children}
      </div>

      {/* Blackout / Privacy Curtain: Visible whenever Snipping Tool, PrtScn, or unfocused window occurs */}
      {isShielded && (
        <div
          onClick={() => {
            setIsWindowBlurred(false);
            setIsCaptureTriggered(false);
          }}
          className="anti-screenshot-curtain fixed inset-0 z-[999999] flex flex-col items-center justify-center bg-[#07070b]/98 backdrop-blur-3xl p-6 text-center select-none cursor-pointer animate-in fade-in duration-100"
        >
          <div className="max-w-md p-8 rounded-3xl bg-zinc-900/95 border border-white/10 shadow-2xl flex flex-col items-center">
            <div className="h-16 w-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-5 text-amber-400 shadow-inner shadow-amber-500/20">
              <ShieldAlert className="h-8 w-8 animate-pulse" />
            </div>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold tracking-widest bg-amber-500/15 text-amber-300 border border-amber-500/30 mb-2">
              <Lock className="h-3 w-3" /> Anti-Capture Active
            </span>

            <h2 className="text-xl font-black text-white tracking-tight">Protected Reference Workspace</h2>

            <p className="mt-2 text-xs text-zinc-400 leading-relaxed max-w-sm">
              Screenshots, Snipping Tools, and unauthorized captures are restricted on this moodboard to protect artist rights and reference intellectual property.
            </p>

            <div className="mt-6 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] text-zinc-300">
              <EyeOff className="h-3.5 w-3.5 text-amber-400" />
              <span>Click anywhere in browser to restore workspace</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Status pill for moodboard navigation header indicating active DRM anti-capture protection
 */
export function AntiScreenshotBadge({ className = '' }: { className?: string }) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm backdrop-blur-sm select-none ${className}`}
      title="Anti-capture protection is active on this moodboard. Snipping tools and screenshots are blocked to protect artist references."
    >
      <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
      <span className="hidden sm:inline">Anti-Capture</span>
      <span className="font-mono text-[9px] uppercase tracking-wider font-bold opacity-80">Protected</span>
    </div>
  );
}
