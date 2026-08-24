export class ChartImageGenerator {
  static async createChartImage(statsData: any): Promise<string> {
    // Create a canvas element for the chart
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 800;
    canvas.height = 400;
    
    if (!ctx) return '';

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw title
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Rapport des Statistiques', canvas.width / 2, 40);

    // Draw period
    ctx.font = '16px Arial';
    ctx.fillStyle = '#666666';
    const periodText = `Période: ${new Date(statsData.period.startDate).toLocaleDateString()} - ${new Date(statsData.period.endDate).toLocaleDateString()}`;
    ctx.fillText(periodText, canvas.width / 2, 70);

    // Draw metrics
    ctx.font = 'bold 18px Arial';
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'left';
    
    const metrics = [
      { label: 'Revenu Total', value: `${statsData.totalRevenue.toFixed(3)} DT`, y: 120 },
      { label: 'Profit Net', value: `${statsData.totalProfit.toFixed(3)} DT`, y: 150 },
      { label: 'Commandes', value: statsData.totalOrders.toString(), y: 180 },
      { label: 'Quantité Vendue', value: statsData.totalQuantitySold.toString(), y: 210 }
    ];

    metrics.forEach(metric => {
      ctx.fillText(metric.label, 50, metric.y);
      ctx.textAlign = 'right';
      ctx.fillText(metric.value, canvas.width - 50, metric.y);
      ctx.textAlign = 'left';
    });

    // Draw profit breakdown chart
    this.drawProfitChart(ctx, statsData, 50, 250, 300, 120);

    return canvas.toDataURL('image/png');
  }

  private static drawProfitChart(ctx: CanvasRenderingContext2D, statsData: any, x: number, y: number, width: number, height: number) {
    const total = statsData.totalRevenue || 1;
    const profitPercentage = (statsData.totalProfit / total) * 100;
    const costPercentage = (statsData.totalCost / total) * 100;

    // Draw chart title
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.fillText('Répartition des Revenus', x + width / 2, y - 10);

    // Draw profit bar
    const profitWidth = (width * profitPercentage) / 100;
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(x, y, profitWidth, 30);

    // Draw cost bar
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(x + profitWidth, y, width - profitWidth, 30);

    // Draw labels
    ctx.font = '12px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    
    if (profitWidth > 50) {
      ctx.fillText(`Profit ${profitPercentage.toFixed(1)}%`, x + profitWidth / 2, y + 19);
    }
    
    if (width - profitWidth > 50) {
      ctx.fillText(`Coût ${costPercentage.toFixed(1)}%`, x + profitWidth + (width - profitWidth) / 2, y + 19);
    }

    // Draw values below
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'left';
    ctx.fillText(`Profit: ${statsData.totalProfit.toFixed(3)} DT`, x, y + 60);
    ctx.fillText(`Coût: ${statsData.totalCost.toFixed(3)} DT`, x, y + 80);
  }
}