/* Copiar texto, baixar arquivos e exportar PDF. */

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback para navegadores antigos / contexto sem permissão
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    document.body.removeChild(ta);
    return ok;
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Compartilha um arquivo pelo menu do sistema (iPhone) ou baixa. */
export async function shareOrDownload(blob: Blob, filename: string, title: string) {
  const file = new File([blob], filename, { type: blob.type });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
    }
  }
  downloadBlob(blob, filename);
}

/**
 * Gera um PDF simples (texto) do prontuário. O jsPDF só é carregado quando
 * você toca em "Exportar PDF" (não pesa na abertura do app) e funciona offline.
 */
/** As fontes padrão do PDF só têm caracteres latinos: troca símbolos que não existem nelas. */
export function pdfSafe(s: string): string {
  return s
    .replace(/₀/g, '0')
    .replace(/₁/g, '1')
    .replace(/₂/g, '2')
    .replace(/₃/g, '3')
    .replace(/⁺/g, '+')
    .replace(/⁻/g, '-')
    .replace(/≥/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/→/g, '->')
    .replace(/←/g, '<-')
    .replace(/↑/g, '(sobe)')
    .replace(/↓/g, '(desce)')
    .replace(/✓/g, 'v')
    .replace(/Δ/g, 'delta ')
    .replace(/[^\u0000-ÿ–—‘’“”•…€]/g, '');
}

export async function exportTextPdf(opts: { title: string; subtitle?: string; text: string; footer: string; filename: string }) {
  const { jsPDF } = await import('jspdf');
  opts = { ...opts, title: pdfSafe(opts.title), subtitle: opts.subtitle && pdfSafe(opts.subtitle), text: pdfSafe(opts.text), footer: pdfSafe(opts.footer) };
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 18;
  const width = doc.internal.pageSize.getWidth() - margin * 2;
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = margin;

  const addFooter = () => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(110);
    const lines = doc.splitTextToSize(opts.footer, width);
    doc.text(lines, margin, pageHeight - 10 - (lines.length - 1) * 3.5);
    doc.setTextColor(0);
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(opts.title, margin, y);
  y += 7;
  if (opts.subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(90);
    doc.text(opts.subtitle, margin, y);
    doc.setTextColor(0);
    y += 7;
  }
  doc.setDrawColor(200);
  doc.line(margin, y, margin + width, y);
  y += 6;

  doc.setFontSize(10.5);
  const lineH = 5;
  for (const para of opts.text.split('\n')) {
    // Rótulos de seção (ex.: "HDA:") em negrito
    const m = /^([A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-Za-zÁÉÍÓÚÂÊÔÃÕÇáéíóúâêôãõç/ -]{0,24}):(\s|$)/.exec(para);
    const lines = doc.splitTextToSize(para || ' ', width) as string[];
    lines.forEach((line, i) => {
      if (y > pageHeight - 22) {
        addFooter();
        doc.addPage();
        y = margin;
      }
      if (i === 0 && m) {
        doc.setFont('helvetica', 'bold');
        doc.text(`${m[1]}:`, margin, y);
        const w = doc.getTextWidth(`${m[1]}: `);
        doc.setFont('helvetica', 'normal');
        doc.text(line.slice(m[1].length + 1).trimStart(), margin + w, y);
      } else {
        doc.setFont('helvetica', 'normal');
        doc.text(line, margin, y);
      }
      y += lineH;
    });
    if (!para.trim()) y += 1;
  }
  addFooter();
  const blob = doc.output('blob');
  await shareOrDownload(blob, opts.filename, opts.title);
}
