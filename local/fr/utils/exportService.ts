import jsPDF from 'jspdf';

interface StatsData {
  totalCost: number;
  totalRevenue: number;
  totalProfit: number;
  totalOrders: number;
  totalQuantitySold: number;
  period: {
    startDate: string;
    endDate: string;
    isSingleDay: boolean;
  };
  filter: {
    category?: string;
    productName?: string;
  };
}

interface Metric {
  label: string;
  value: string;
  color: number[]; // RGB color array
}

export class ExportService {
  static async exportToPDF(statsData: StatsData, filename: string) {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // Add header with gradient background
      this.addHeader(pdf, statsData);
      
      // Add key metrics section
      this.addMetricsSection(pdf, statsData);
      
      // Add profit breakdown chart
      this.addProfitChart(pdf, statsData);
      
      // Add performance chart
      this.addPerformanceChart(pdf, statsData);
      
      // Add footer
      this.addFooter(pdf);
      
      pdf.save(`${filename}.pdf`);
      return true;
    } catch (error) {
      console.error('PDF export error:', error);
      return false;
    }
  }

  private static addHeader(pdf: jsPDF, statsData: StatsData) {
    // Header background
    pdf.setFillColor(59, 130, 246); // Blue color
    pdf.rect(0, 0, 210, 60, 'F');
    
    // Title - Center manually by calculating text width
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    const title = 'Rapport des Statistiques';
    const titleWidth = pdf.getTextWidth(title);
    pdf.text(title, (210 - titleWidth) / 2, 25);
    
    // Period
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    const periodText = statsData?.period?.startDate && statsData?.period?.endDate
      ? `Période: ${new Date(statsData.period.startDate).toLocaleDateString()} - ${new Date(statsData.period.endDate).toLocaleDateString()}`
      : 'Période: Non spécifiée';
    const periodWidth = pdf.getTextWidth(periodText);
    pdf.text(periodText, (210 - periodWidth) / 2, 35);
    
    // Filter
    let filterText = 'Toutes les catégories';
    if (statsData?.filter?.category) {
      filterText = `Catégorie: ${statsData.filter.category}`;
    } else if (statsData?.filter?.productName) {
      filterText = `Produit: ${statsData.filter.productName}`;
    }
    const filterWidth = pdf.getTextWidth(filterText);
    pdf.text(filterText, (210 - filterWidth) / 2, 42);
  }

  private static addMetricsSection(pdf: jsPDF, statsData: StatsData) {
    const yStart = 75;
    
    // Section title
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Métriques Clés', 20, yStart);
    
    // Metrics grid
    const metrics: Metric[] = [
      { 
        label: 'Revenu Total', 
        value: `${this.safeToFixed(statsData?.totalRevenue)} DT`,
        color: [34, 197, 94] // Green
      },
      { 
        label: 'Profit Net', 
        value: `${this.safeToFixed(statsData?.totalProfit)} DT`,
        color: [59, 130, 246] // Blue
      },
      { 
        label: 'Commandes', 
        value: (statsData?.totalOrders ?? 0).toString(),
        color: [168, 85, 247] // Purple
      },
      { 
        label: 'Quantité Vendue', 
        value: (statsData?.totalQuantitySold ?? 0).toString(),
        color: [249, 115, 22] // Orange
      }
    ];

    metrics.forEach((metric, index) => {
      const x = 20 + (index % 2) * 85;
      const y = yStart + 15 + Math.floor(index / 2) * 25;
      
      // Metric box
      pdf.setFillColor(metric.color[0], metric.color[1], metric.color[2]);
      pdf.roundedRect(x, y, 75, 20, 3, 3, 'F');
      
      // Text
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text(metric.label, x + 5, y + 8);
      
      pdf.setFontSize(12);
      pdf.text(metric.value, x + 5, y + 15);
    });
  }

  private static addProfitChart(pdf: jsPDF, statsData: StatsData) {
    const yStart = 150;
    const chartWidth = 170;
    const chartHeight = 80;
    
    // Section title
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Répartition des Revenus', 20, yStart);
    
    // Chart container
    pdf.setDrawColor(200, 200, 200);
    pdf.setFillColor(250, 250, 250);
    pdf.roundedRect(20, yStart + 5, chartWidth, chartHeight, 3, 3, 'FD');
    
    const total = statsData?.totalRevenue || 1;
    const profitPercentage = ((statsData?.totalProfit ?? 0) / total) * 100;
    const costPercentage = ((statsData?.totalCost ?? 0) / total) * 100;
    
    // Profit bar
    const profitWidth = (chartWidth * profitPercentage) / 100;
    pdf.setFillColor(34, 197, 94); // Green
    pdf.roundedRect(25, yStart + 25, profitWidth - 10, 30, 2, 2, 'F');
    
    // Cost bar
    pdf.setFillColor(239, 68, 68); // Red
    pdf.roundedRect(25 + profitWidth, yStart + 25, chartWidth - profitWidth - 10, 30, 2, 2, 'F');
    
    // Labels inside bars - Center text manually
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    
    if (profitWidth > 40) {
      const profitText = `PROFIT ${profitPercentage.toFixed(1)}%`;
      const profitTextWidth = pdf.getTextWidth(profitText);
      pdf.text(profitText, 25 + (profitWidth - 10) / 2 - profitTextWidth / 2, yStart + 43);
    }
    
    if (chartWidth - profitWidth > 40) {
      const costText = `COÛT ${costPercentage.toFixed(1)}%`;
      const costTextWidth = pdf.getTextWidth(costText);
      pdf.text(costText, 25 + profitWidth + (chartWidth - profitWidth - 10) / 2 - costTextWidth / 2, yStart + 43);
    }
    
    // Values below chart
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    
    pdf.text(`Profit: ${this.safeToFixed(statsData.totalProfit)} DT`, 25, yStart + 70);
    pdf.text(`Coût: ${this.safeToFixed(statsData.totalCost)} DT`, 25, yStart + 80);
    
    const marginText = `Marge: ${profitPercentage.toFixed(1)}%`;
    const marginTextWidth = pdf.getTextWidth(marginText);
    pdf.text(marginText, 120 + (50 - marginTextWidth) / 2, yStart + 75);
  }

  private static addPerformanceChart(pdf: jsPDF, statsData: StatsData) {
    const yStart = 250;
    const chartWidth = 170;
    const chartHeight = 80;
    
    // Section title
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Analyse de Performance', 20, yStart);
    
    // Chart container
    pdf.setDrawColor(200, 200, 200);
    pdf.setFillColor(250, 250, 250);
    pdf.roundedRect(20, yStart + 5, chartWidth, chartHeight, 3, 3, 'FD');
    
    // Find max value for scaling
    const maxValue = Math.max(
      statsData?.totalRevenue ?? 0,
      statsData?.totalProfit ?? 0,
      statsData?.totalCost ?? 0
    );
    const scale = maxValue > 0 ? (chartHeight - 20) / maxValue : 1;
    
    // Bars
    const barWidth = 40;
    const spacing = 15;
    const baseY = yStart + chartHeight - 5;
    
    // Revenue bar
    pdf.setFillColor(59, 130, 246); // Blue
    const revenueHeight = (statsData?.totalRevenue ?? 0) * scale;
    pdf.rect(30, baseY - revenueHeight, barWidth, revenueHeight, 'F');
    
    // Profit bar
    pdf.setFillColor(34, 197, 94); // Green
    const profitHeight = (statsData?.totalProfit ?? 0) * scale;
    pdf.rect(30 + barWidth + spacing, baseY - profitHeight, barWidth, profitHeight, 'F');
    
    // Cost bar
    pdf.setFillColor(239, 68, 68); // Red
    const costHeight = (statsData?.totalCost ?? 0) * scale;
    pdf.rect(30 + 2 * (barWidth + spacing), baseY - costHeight, barWidth, costHeight, 'F');
    
    // Bar labels - Center text manually
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    
    const revenueLabel = 'Revenu';
    const revenueLabelWidth = pdf.getTextWidth(revenueLabel);
    pdf.text(revenueLabel, 30 + barWidth / 2 - revenueLabelWidth / 2, baseY + 8);
    
    const profitLabel = 'Profit';
    const profitLabelWidth = pdf.getTextWidth(profitLabel);
    pdf.text(profitLabel, 30 + barWidth + spacing + barWidth / 2 - profitLabelWidth / 2, baseY + 8);
    
    const costLabel = 'Coût';
    const costLabelWidth = pdf.getTextWidth(costLabel);
    pdf.text(costLabel, 30 + 2 * (barWidth + spacing) + barWidth / 2 - costLabelWidth / 2, baseY + 8);
    
    // Values on bars - Center text manually
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    
    if (revenueHeight > 15) {
      const revenueValue = this.safeToFixed(statsData?.totalRevenue);
      const revenueValueWidth = pdf.getTextWidth(revenueValue);
      pdf.text(revenueValue, 30 + barWidth / 2 - revenueValueWidth / 2, baseY - revenueHeight + 12);
    }
    
    if (profitHeight > 15) {
      const profitValue = this.safeToFixed(statsData?.totalProfit);
      const profitValueWidth = pdf.getTextWidth(profitValue);
      pdf.text(profitValue, 30 + barWidth + spacing + barWidth / 2 - profitValueWidth / 2, baseY - profitHeight + 12);
    }
    
    if (costHeight > 15) {
      const costValue = this.safeToFixed(statsData?.totalCost);
      const costValueWidth = pdf.getTextWidth(costValue);
      pdf.text(costValue, 30 + 2 * (barWidth + spacing) + barWidth / 2 - costValueWidth / 2, baseY - costHeight + 12);
    }
    
    // Y-axis label
    pdf.setTextColor(100, 100, 100);
    pdf.setFontSize(10);
    pdf.text('DT', 15, yStart + 30);
    pdf.text('↑', 15, yStart + 35);
  }

  private static addFooter(pdf: jsPDF) {
    const pageHeight = pdf.internal.pageSize.height;
    
    // Footer background
    pdf.setFillColor(249, 250, 251);
    pdf.rect(0, pageHeight - 30, 210, 30, 'F');
    
    // Footer text
    pdf.setTextColor(100, 100, 100);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    
    pdf.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 20, pageHeight - 15);
    
    const footerText = 'Système de Point de Vente - Rapport Automatisé';
    const footerTextWidth = pdf.getTextWidth(footerText);
    pdf.text(footerText, (210 - footerTextWidth) / 2, pageHeight - 15);
    
    const pageText = 'Page 1/1';
    const pageTextWidth = pdf.getTextWidth(pageText);
    pdf.text(pageText, 210 - pageTextWidth - 20, pageHeight - 15);
  }

  static exportToCSV(statsData: StatsData, filename: string) {
    try {
      const headers = ['Métrique', 'Valeur', 'Unité'];
      const data = [
        ['Revenu Total', this.safeToFixed(statsData.totalRevenue), 'DT'],
        ['Coût Total', this.safeToFixed(statsData.totalCost), 'DT'],
        ['Profit Total', this.safeToFixed(statsData.totalProfit), 'DT'],
        ['Nombre de Commandes', statsData.totalOrders.toString(), ''],
        ['Quantité Vendue', statsData.totalQuantitySold.toString(), ''],
        ['Date de Début', statsData.period.startDate, ''],
        ['Date de Fin', statsData.period.endDate, ''],
        ['Filtre', statsData.filter.category || statsData.filter.productName || 'Toutes les données', '']
      ];

      let csvContent = 'data:text/csv;charset=utf-8,';
      csvContent += headers.join(',') + '\n';
      
      data.forEach(row => {
        csvContent += row.join(',') + '\n';
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `${filename}.csv`);
      document.body.appendChild(link);
      
      link.click();
      document.body.removeChild(link);
      
      return true;
    } catch (error) {
      console.error('CSV export error:', error);
      return false;
    }
  }

  static getExportFilename(statsData: StatsData): string {
    const date = new Date().toISOString().split('T')[0];
    let prefix = 'statistiques';
    
    if (statsData.filter.category) {
      prefix = `statistiques-${this.sanitizeFilename(statsData.filter.category)}`;
    } else if (statsData.filter.productName) {
      prefix = `statistiques-${this.sanitizeFilename(statsData.filter.productName)}`;
    }
    
    return `${prefix}-${date}`;
  }

  private static sanitizeFilename(name: string): string {
    return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  }

  // Safe number formatting to handle null/undefined
  private static safeToFixed(value: number): string {
    if (value === null || value === undefined || isNaN(value)) {
      return '0.00';
    }
    return value.toFixed(3);
  }
}