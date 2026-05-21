import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  ButtonGroup,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Snackbar,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
} from '@mui/material';
import {
  Close,
  DarkMode,
  LightMode,
  PictureAsPdf,
  Print,
  Visibility,
} from '@mui/icons-material';
import type { AnalyticsReportData } from '../../types/analyticsReport';
import { AnalyticsReportTemplate } from './AnalyticsReportTemplate';
import { exportReportToPdf, printReport, waitForPaint } from '../../utils/reportExport';

interface ReportExportPanelProps {
  data: AnalyticsReportData;
  formatCurrency: (n: number) => string;
  loading?: boolean;
}

export const ReportExportPanel: React.FC<ReportExportPanelProps> = ({
  data,
  formatCurrency,
  loading = false,
}) => {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reportCaptureId = previewOpen ? 'analytics-report-root' : undefined;

  const handlePdfDownload = async () => {
    try {
      setError(null);
      setExporting(true);
      setDarkMode(false);
      setPreviewOpen(true);
      await waitForPaint(1400);
      await exportReportToPdf(
        `analytics-${data.meta.periodLabel.replace(/[^a-z0-9]+/gi, '-')}-${Date.now()}.pdf`
      );
    } catch (e) {
      console.error('PDF export failed', e);
      setError(e instanceof Error ? e.message : 'PDF download failed. Try Print → Save as PDF.');
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = async () => {
    try {
      setError(null);
      setExporting(true);
      setPreviewOpen(true);
      await waitForPaint(800);
      printReport();
    } catch (e) {
      console.error('Print failed', e);
      setError('Print failed. Try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <ButtonGroup size="small" variant="outlined">
        <Tooltip title="Preview report">
          <Button startIcon={<Visibility />} onClick={() => setPreviewOpen(true)} disabled={loading}>
            Preview
          </Button>
        </Tooltip>
        <Tooltip title="Download PDF">
          <Button
            startIcon={<PictureAsPdf />}
            onClick={handlePdfDownload}
            disabled={loading || exporting}
          >
            {exporting ? 'Preparing…' : 'PDF'}
          </Button>
        </Tooltip>
        <Tooltip title="Print report">
          <Button startIcon={<Print />} onClick={handlePrint} disabled={loading || exporting}>
            Print
          </Button>
        </Tooltip>
      </ButtonGroup>

      <Dialog
        open={previewOpen}
        onClose={() => !exporting && setPreviewOpen(false)}
        maxWidth="lg"
        fullWidth
        scroll="paper"
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
          Report Preview
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ToggleButtonGroup
              size="small"
              value={darkMode ? 'dark' : 'light'}
              exclusive
              onChange={(_, v) => v && setDarkMode(v === 'dark')}
            >
              <ToggleButton value="light">
                <LightMode fontSize="small" />
              </ToggleButton>
              <ToggleButton value="dark">
                <DarkMode fontSize="small" />
              </ToggleButton>
            </ToggleButtonGroup>
            <IconButton onClick={() => setPreviewOpen(false)} disabled={exporting} aria-label="Close">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: darkMode ? '#0b1220' : '#eef2f7', p: 2 }}>
          {exporting && (
            <Alert severity="info" sx={{ mb: 2 }} className="no-pdf-capture">
              Preparing report for download…
            </Alert>
          )}
          <AnalyticsReportTemplate
            data={data}
            formatCurrency={formatCurrency}
            loading={loading}
            darkMode={darkMode}
            exportMode
            id={reportCaptureId}
          />
        </DialogContent>
      </Dialog>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setError(null)} sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ReportExportPanel;
