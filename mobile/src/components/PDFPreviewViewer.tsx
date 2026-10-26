import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ExternalLink,
  Download,
  Loader2,
  AlertTriangle,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
}

interface PDFPreviewViewerProps {
  blob?: Blob | null;
  url?: string | null;
  docTitle?: string;
  onOpenExternal?: () => void;
  onDownload?: () => void;
  isOpeningExternal?: boolean;
  isDownloading?: boolean;
}

export const PDFPreviewViewer: React.FC<PDFPreviewViewerProps> = ({
  blob,
  url,
  docTitle = 'Document',
  onOpenExternal,
  onDownload,
  isOpeningExternal = false,
  isDownloading = false,
}) => {
  const { colors } = useTheme();

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.1);
  const [rotation, setRotation] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Load PDF Document
  useEffect(() => {
    let isCancelled = false;

    const loadDocument = async () => {
      setIsLoading(true);
      setLoadError(null);
      setCurrentPage(1);

      try {
        let loadingTask: any = null;

        if (blob) {
          const arrayBuffer = await blob.arrayBuffer();
          loadingTask = pdfjsLib.getDocument({
            data: arrayBuffer,
            cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
            cMapPacked: true,
          });
        } else if (url) {
          loadingTask = pdfjsLib.getDocument({
            url: url,
            cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
            cMapPacked: true,
          });
        } else {
          setLoadError('No PDF data provided.');
          setIsLoading(false);
          return;
        }

        const loadedPdf = await loadingTask.promise;
        if (isCancelled) return;

        setPdfDoc(loadedPdf);
        setNumPages(loadedPdf.numPages);
        setIsLoading(false);
      } catch (err: any) {
        if (isCancelled) return;
        console.error('PDF.js document loading error:', err);
        setLoadError(err?.message || 'Unable to parse PDF data.');
        setIsLoading(false);
      }
    };

    loadDocument();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (e) {}
      }
    };
  }, [blob, url]);

  // Render Current Page onto Canvas
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    let isCancelled = false;

    const renderPage = async () => {
      // Cancel any ongoing render
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (e) {}
      }

      setIsRendering(true);

      try {
        const page = await pdfDoc.getPage(currentPage);
        if (isCancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Calculate responsive scale based on container width if available
        let computedScale = scale;
        if (containerRef.current) {
          const containerWidth = containerRef.current.clientWidth - 24;
          const unscaledViewport = page.getViewport({ scale: 1.0, rotation });
          if (containerWidth > 0 && unscaledViewport.width > 0) {
            const fitScale = containerWidth / unscaledViewport.width;
            // Base scale multiplier on user zoom scale
            computedScale = fitScale * scale;
          }
        }

        const viewport = page.getViewport({ scale: computedScale, rotation });
        const pixelRatio = window.devicePixelRatio || 1;

        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
          transform: pixelRatio !== 1 ? [pixelRatio, 0, 0, pixelRatio, 0, 0] : undefined,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;

        await renderTask.promise;
        if (isCancelled) return;
        setIsRendering(false);
      } catch (err: any) {
        if (err?.name === 'RenderingCancelledException') {
          return;
        }
        if (isCancelled) return;
        console.warn('PDF.js render page error:', err);
        setIsRendering(false);
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (e) {}
      }
    };
  }, [pdfDoc, currentPage, scale, rotation]);

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < numPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 3.0));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.6));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        minHeight: 460,
        backgroundColor: colors.surface,
        borderRadius: 14,
        overflow: 'hidden',
        border: `1px solid ${colors.surfaceBorder}`,
      }}
    >
      {/* Top Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          backgroundColor: colors.surfaceCard,
          borderBottom: `1px solid ${colors.surfaceBorder}`,
          flexWrap: 'wrap',
          gap: 8,
          zIndex: 10,
        }}
      >
        {/* Page Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={handlePrevPage}
            disabled={currentPage <= 1 || isLoading}
            style={{
              padding: '6px 8px',
              borderRadius: 8,
              backgroundColor: colors.surface,
              border: `1px solid ${colors.surfaceBorder}`,
              color: currentPage <= 1 ? colors.textMuted : colors.text,
              cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChevronLeft size={16} />
          </button>

          <span style={{ fontSize: 12, fontWeight: 600, color: colors.text, minWidth: 70, textAlign: 'center' }}>
            {numPages > 0 ? `${currentPage} / ${numPages}` : '– / –'}
          </span>

          <button
            onClick={handleNextPage}
            disabled={currentPage >= numPages || isLoading}
            style={{
              padding: '6px 8px',
              borderRadius: 8,
              backgroundColor: colors.surface,
              border: `1px solid ${colors.surfaceBorder}`,
              color: currentPage >= numPages ? colors.textMuted : colors.text,
              cursor: currentPage >= numPages ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Zoom & Rotation Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={handleZoomOut}
            disabled={scale <= 0.6 || isLoading}
            title="Zoom Out"
            style={{
              padding: '6px 8px',
              borderRadius: 8,
              backgroundColor: colors.surface,
              border: `1px solid ${colors.surfaceBorder}`,
              color: colors.text,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ZoomOut size={15} />
          </button>

          <span style={{ fontSize: 11, fontWeight: 700, color: colors.textMuted, minWidth: 38, textAlign: 'center' }}>
            {Math.round(scale * 100)}%
          </span>

          <button
            onClick={handleZoomIn}
            disabled={scale >= 3.0 || isLoading}
            title="Zoom In"
            style={{
              padding: '6px 8px',
              borderRadius: 8,
              backgroundColor: colors.surface,
              border: `1px solid ${colors.surfaceBorder}`,
              color: colors.text,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ZoomIn size={15} />
          </button>

          <button
            onClick={handleRotate}
            disabled={isLoading}
            title="Rotate 90°"
            style={{
              padding: '6px 8px',
              borderRadius: 8,
              backgroundColor: colors.surface,
              border: `1px solid ${colors.surfaceBorder}`,
              color: colors.text,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <RotateCw size={15} />
          </button>
        </div>

        {/* Action Buttons: System Viewer & Download */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {onOpenExternal && (
            <button
              onClick={onOpenExternal}
              disabled={isOpeningExternal}
              title="Open in System PDF Viewer"
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                backgroundColor: 'rgba(13, 148, 136, 0.15)',
                border: '1px solid rgba(13, 148, 136, 0.3)',
                color: colors.accent,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              {isOpeningExternal ? (
                <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <ExternalLink size={13} />
              )}
              <span>System Viewer</span>
            </button>
          )}

          {onDownload && (
            <button
              onClick={onDownload}
              disabled={isDownloading}
              title="Download PDF"
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                backgroundColor: colors.surface,
                border: `1px solid ${colors.surfaceBorder}`,
                color: colors.text,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {isDownloading ? (
                <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <Download size={13} />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Main Preview Container */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: isLoading || loadError ? 'center' : 'flex-start',
          padding: 16,
          backgroundColor: '#0F172A',
          position: 'relative',
          minHeight: 400,
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <Loader2 size={36} color={colors.accent} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: '#E2E8F0' }}>Rendering PDF Preview...</div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>Loading document vectors & typography</div>
          </div>
        ) : loadError ? (
          <div style={{ textAlign: 'center', padding: 24, maxWidth: 360 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
                color: colors.danger,
              }}
            >
              <FileText size={26} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#F1F5F9' }}>In-App Preview Unavailable</div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 6, lineHeight: 1.4 }}>
              {loadError}
            </div>
            {onOpenExternal && (
              <button
                onClick={onOpenExternal}
                disabled={isOpeningExternal}
                style={{
                  marginTop: 16,
                  padding: '10px 18px',
                  borderRadius: 10,
                  backgroundColor: colors.accent,
                  color: '#FFF',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 4px 12px rgba(13, 148, 136, 0.3)',
                }}
              >
                <ExternalLink size={15} />
                <span>Open in System PDF Viewer</span>
              </button>
            )}
          </div>
        ) : (
          <div
            style={{
              position: 'relative',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.4)',
              borderRadius: 6,
              overflow: 'hidden',
              backgroundColor: '#FFFFFF',
              display: 'inline-block',
              margin: 'auto 0',
            }}
          >
            <canvas ref={canvasRef} style={{ display: 'block' }} />
            {isRendering && (
              <div
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  backgroundColor: 'rgba(15, 23, 42, 0.8)',
                  padding: '4px 8px',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  color: '#38BDF8',
                  fontSize: 10,
                  fontWeight: 600,
                  backdropFilter: 'blur(4px)',
                }}
              >
                <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Rendering...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Status Footnote */}
      {numPages > 0 && !loadError && (
        <div
          style={{
            padding: '6px 12px',
            backgroundColor: colors.surfaceCard,
            borderTop: `1px solid ${colors.surfaceBorder}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 11,
            color: colors.textMuted,
          }}
        >
          <span>{docTitle}</span>
          <span>
            Page {currentPage} of {numPages} • Native Canvas Engine
          </span>
        </div>
      )}
    </div>
  );
};
