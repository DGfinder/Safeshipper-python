'use client';

import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// Export data types
export interface ExportData {
  title: string;
  data: any[];
  headers?: string[];
  metadata?: {
    generatedAt: Date;
    timeRange: string;
    filters?: Record<string, any>;
  };
}

// Chart data for export
export interface ChartExportData {
  chartType: 'line' | 'bar' | 'pie' | 'area' | 'radar' | 'scatter';
  title: string;
  data: any[];
  xAxisKey?: string;
  yAxisKeys?: string[];
}

// Export formats
export type ExportFormat = 'pdf' | 'excel' | 'csv' | 'json';

// Export configuration
export interface ExportConfig {
  format: ExportFormat;
  filename?: string;
  includeCharts?: boolean;
  includeMetadata?: boolean;
  pageOrientation?: 'portrait' | 'landscape';
  customHeaders?: Record<string, string>;
}

// CSV Export
export function exportToCSV(data: ExportData, config: ExportConfig = { format: 'csv' }) {
  const { title, data: rows, headers, metadata } = data;
  const filename = config.filename || `${title.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;

  // Prepare CSV content
  let csvContent = '';
  
  // Add metadata if requested
  if (config.includeMetadata && metadata) {
    csvContent += `# ${title}\n`;
    csvContent += `# Generated: ${metadata.generatedAt.toISOString()}\n`;
    csvContent += `# Time Range: ${metadata.timeRange}\n`;
    if (metadata.filters) {
      csvContent += `# Filters: ${JSON.stringify(metadata.filters)}\n`;
    }
    csvContent += '\n';
  }

  // Add headers
  if (headers) {
    csvContent += headers.join(',') + '\n';
  } else if (rows.length > 0) {
    csvContent += Object.keys(rows[0]).join(',') + '\n';
  }

  // Add data rows
  rows.forEach(row => {
    const values = headers ? headers.map(h => row[h] || '') : Object.values(row);
    const escapedValues = values.map(value => {
      const str = String(value);
      // Escape quotes and wrap in quotes if contains comma or quote
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    });
    csvContent += escapedValues.join(',') + '\n';
  });

  // Download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, filename);
}

// Excel Export
export function exportToExcel(data: ExportData[], config: ExportConfig = { format: 'excel' }) {
  const filename = config.filename || `analytics-export-${new Date().toISOString().split('T')[0]}.xlsx`;

  // Create workbook
  const workbook = XLSX.utils.book_new();

  data.forEach((sheet, index) => {
    const { title, data: rows, headers, metadata } = sheet;
    const sheetName = title.substring(0, 31); // Excel sheet name limit

    // Prepare sheet data
    const sheetData: any[][] = [];

    // Add metadata if requested
    if (config.includeMetadata && metadata) {
      sheetData.push([title]);
      sheetData.push(['Generated:', metadata.generatedAt.toISOString()]);
      sheetData.push(['Time Range:', metadata.timeRange]);
      if (metadata.filters) {
        sheetData.push(['Filters:', JSON.stringify(metadata.filters)]);
      }
      sheetData.push([]); // Empty row
    }

    // Add headers
    if (headers) {
      sheetData.push(headers);
    } else if (rows.length > 0) {
      sheetData.push(Object.keys(rows[0]));
    }

    // Add data rows
    rows.forEach(row => {
      const values = headers ? headers.map(h => row[h] || '') : Object.values(row);
      sheetData.push(values);
    });

    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  });

  // Write and download file
  XLSX.writeFile(workbook, filename);
}

// PDF Export
export function exportToPDF(data: ExportData[], config: ExportConfig = { format: 'pdf' }) {
  const filename = config.filename || `analytics-export-${new Date().toISOString().split('T')[0]}.pdf`;
  const orientation = config.pageOrientation || 'portrait';

  // Create PDF document
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4'
  });

  let currentY = 20;
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;

  // Title
  doc.setFontSize(20);
  doc.text('Analytics Export Report', margin, currentY);
  currentY += 15;

  // Generation info
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toISOString()}`, margin, currentY);
  currentY += 10;

  data.forEach((sheet, index) => {
    const { title, data: rows, headers, metadata } = sheet;

    // Check if we need a new page
    if (currentY > pageHeight - 60) {
      doc.addPage();
      currentY = 20;
    }

    // Section title
    doc.setFontSize(14);
    doc.text(title, margin, currentY);
    currentY += 10;

    // Metadata
    if (config.includeMetadata && metadata) {
      doc.setFontSize(9);
      doc.text(`Time Range: ${metadata.timeRange}`, margin, currentY);
      currentY += 6;
      if (metadata.filters) {
        doc.text(`Filters: ${JSON.stringify(metadata.filters)}`, margin, currentY);
        currentY += 6;
      }
    }

    currentY += 5;

    // Table headers
    if (headers || rows.length > 0) {
      const tableHeaders = headers || Object.keys(rows[0]);
      const columnWidth = (pageWidth - 2 * margin) / tableHeaders.length;

      // Draw headers
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      tableHeaders.forEach((header, i) => {
        doc.text(header, margin + i * columnWidth, currentY);
      });
      currentY += 8;

      // Draw data rows (limit to prevent overflow)
      doc.setFont('helvetica', 'normal');
      const maxRows = Math.min(rows.length, 20); // Limit rows per section
      
      for (let i = 0; i < maxRows; i++) {
        const row = rows[i];
        const values = tableHeaders.map(h => String(row[h] || ''));
        
        values.forEach((value, j) => {
          // Truncate long values
          const truncated = value.length > 15 ? value.substring(0, 12) + '...' : value;
          doc.text(truncated, margin + j * columnWidth, currentY);
        });
        currentY += 6;

        // Check if we need a new page
        if (currentY > pageHeight - 40) {
          doc.addPage();
          currentY = 20;
        }
      }

      if (rows.length > maxRows) {
        doc.setFontSize(9);
        doc.text(`... and ${rows.length - maxRows} more rows`, margin, currentY);
        currentY += 10;
      }
    }

    currentY += 15;
  });

  // Save PDF
  doc.save(filename);
}

// JSON Export
export function exportToJSON(data: ExportData[], config: ExportConfig = { format: 'json' }) {
  const filename = config.filename || `analytics-export-${new Date().toISOString().split('T')[0]}.json`;

  const exportData = {
    exportInfo: {
      generatedAt: new Date().toISOString(),
      format: 'json',
      version: '1.0'
    },
    data: data.map(sheet => ({
      title: sheet.title,
      metadata: sheet.metadata,
      headers: sheet.headers,
      data: sheet.data
    }))
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
    type: 'application/json;charset=utf-8;' 
  });
  saveAs(blob, filename);
}

// Chart data export helpers
export function prepareChartDataForExport(chartData: ChartExportData): ExportData {
  const { title, data, xAxisKey, yAxisKeys } = chartData;

  // Determine headers based on chart type
  let headers: string[] = [];
  if (xAxisKey) headers.push(xAxisKey);
  if (yAxisKeys) headers.push(...yAxisKeys);
  
  // If no specific keys, use all data keys
  if (headers.length === 0 && data.length > 0) {
    headers = Object.keys(data[0]);
  }

  return {
    title,
    data,
    headers,
    metadata: {
      generatedAt: new Date(),
      timeRange: 'Current View',
      filters: { chartType: chartData.chartType }
    }
  };
}

// Batch export function
export async function batchExport(
  datasets: ExportData[],
  format: ExportFormat,
  config: Partial<ExportConfig> = {}
) {
  const finalConfig: ExportConfig = {
    format,
    includeMetadata: true,
    ...config
  };

  try {
    switch (format) {
      case 'csv':
        // Export each dataset as separate CSV
        datasets.forEach(data => exportToCSV(data, finalConfig));
        break;
      case 'excel':
        // Export all datasets as sheets in one Excel file
        exportToExcel(datasets, finalConfig);
        break;
      case 'pdf':
        // Export all datasets in one PDF
        exportToPDF(datasets, finalConfig);
        break;
      case 'json':
        // Export all datasets as JSON
        exportToJSON(datasets, finalConfig);
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
    
    return { success: true, message: `Export completed successfully` };
  } catch (error) {
    console.error('Export failed:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Export failed' 
    };
  }
}

// Export analytics data helper
export function exportAnalyticsData(
  timeRange: string,
  selectedCharts: string[],
  format: ExportFormat
) {
  // This would be connected to your actual data sources
  // For now, we'll use the same generators as the charts
  const datasets: ExportData[] = [];

  if (selectedCharts.includes('shipments')) {
    datasets.push({
      title: 'Shipment Trends',
      data: generateShipmentTrendData(),
      headers: ['month', 'shipments', 'dangerous', 'completed', 'delayed'],
      metadata: {
        generatedAt: new Date(),
        timeRange,
        filters: { chartType: 'shipments' }
      }
    });
  }

  if (selectedCharts.includes('fleet')) {
    datasets.push({
      title: 'Fleet Utilization',
      data: generateFleetUtilizationData(),
      headers: ['day', 'utilization', 'maintenance', 'available'],
      metadata: {
        generatedAt: new Date(),
        timeRange,
        filters: { chartType: 'fleet' }
      }
    });
  }

  if (selectedCharts.includes('compliance')) {
    datasets.push({
      title: 'Compliance Scores',
      data: generateComplianceData(),
      headers: ['category', 'score', 'target'],
      metadata: {
        generatedAt: new Date(),
        timeRange,
        filters: { chartType: 'compliance' }
      }
    });
  }

  return batchExport(datasets, format);
}

// Helper data generators (matching chart components)
function generateShipmentTrendData() {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months.map(month => ({
    month,
    shipments: Math.floor(Math.random() * 500) + 200,
    dangerous: Math.floor(Math.random() * 100) + 50,
    completed: Math.floor(Math.random() * 450) + 180,
    delayed: Math.floor(Math.random() * 30) + 10,
  }));
}

function generateFleetUtilizationData() {
  const days = Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`);
  return days.map(day => ({
    day,
    utilization: Math.floor(Math.random() * 40) + 60,
    maintenance: Math.floor(Math.random() * 10) + 5,
    available: Math.floor(Math.random() * 30) + 70,
  }));
}

function generateComplianceData() {
  return [
    { category: 'DG Classification', score: 95, target: 98 },
    { category: 'Documentation', score: 92, target: 95 },
    { category: 'Packaging', score: 88, target: 90 },
    { category: 'Labeling', score: 94, target: 95 },
    { category: 'Training', score: 90, target: 92 },
    { category: 'Emergency Prep', score: 85, target: 88 },
  ];
}