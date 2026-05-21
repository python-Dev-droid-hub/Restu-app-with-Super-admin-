const REPORT_ELEMENT_ID = 'analytics-report-root';

const sanitizeCssText = (css: string) =>
  css
    .replace(/color-mix\([^)]+\)/gi, 'rgba(100, 116, 139, 0.12)')
    .replace(/color\([^)]+\)/gi, '#64748b');

/** html2canvas cannot parse modern color-mix() / color() from MUI global CSS */
function patchStylesForHtml2Canvas(): () => void {
  const backups: Array<{ el: HTMLStyleElement; text: string }> = [];
  document.querySelectorAll('style').forEach((node) => {
    const el = node as HTMLStyleElement;
    const text = el.textContent;
    if (!text || !/color-mix|color\s*\(/i.test(text)) return;
    backups.push({ el, text });
    el.textContent = sanitizeCssText(text);
  });
  return () => {
    backups.forEach(({ el, text }) => {
      el.textContent = text;
    });
  };
}

const waitForPaint = (ms = 1200) =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(resolve, ms);
      });
    });
  });

export async function exportReportToPdf(fileName = 'restaurant-analytics-report.pdf') {
  const element = document.getElementById(REPORT_ELEMENT_ID);
  if (!element) {
    throw new Error('Report not ready. Open Preview first or try again.');
  }

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const restoreStyles = patchStylesForHtml2Canvas();

  const sanitizeStylesForCanvas = (doc: Document) => {
    doc.querySelectorAll('style').forEach((styleNode) => {
      const text = styleNode.textContent;
      if (!text || !/color-mix|color\s*\(/i.test(text)) return;
      styleNode.textContent = sanitizeCssText(text);
    });
  };

  let canvas;
  try {
    canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    width: element.scrollWidth,
    height: element.scrollHeight,
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
    onclone: (doc) => {
      sanitizeStylesForCanvas(doc);
      const cloned = doc.getElementById(REPORT_ELEMENT_ID);
      if (cloned) {
        cloned.style.opacity = '1';
        cloned.style.position = 'static';
        cloned.style.left = 'auto';
        cloned.style.top = 'auto';
      }
    },
    });
  } finally {
    restoreStyles();
  }

  const imgData = canvas.toDataURL('image/jpeg', 0.92);
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const printableWidth = pageWidth - margin * 2;
  const printableHeight = pageHeight - margin * 2;
  const imgHeightMm = (canvas.height * printableWidth) / canvas.width;

  let positionY = margin;
  let heightLeft = imgHeightMm;

  pdf.addImage(imgData, 'JPEG', margin, positionY, printableWidth, imgHeightMm);
  heightLeft -= printableHeight;

  while (heightLeft > 0) {
    pdf.addPage();
    positionY = margin - (imgHeightMm - heightLeft);
    pdf.addImage(imgData, 'JPEG', margin, positionY, printableWidth, imgHeightMm);
    heightLeft -= printableHeight;
  }

  pdf.save(fileName);
}

export function printReport() {
  const style = document.createElement('style');
  style.id = 'analytics-report-print-style';
  style.textContent = `
    @media print {
      body * { visibility: hidden !important; }
      #${REPORT_ELEMENT_ID}, #${REPORT_ELEMENT_ID} * { visibility: visible !important; }
      #${REPORT_ELEMENT_ID} {
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
        width: 100% !important;
      }
    }
  `;
  document.head.appendChild(style);
  window.print();
  setTimeout(() => style.remove(), 500);
}

export { REPORT_ELEMENT_ID, waitForPaint };
