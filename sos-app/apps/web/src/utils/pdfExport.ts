import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Emergency, LocationPoint } from '@/types';
import { format } from 'date-fns';

export async function exportEmergencyReport(
  emergency: Emergency,
  locationTrail: LocationPoint[],
  acknowledgments: any[]
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Title
  doc.setFontSize(20);
  doc.setTextColor(239, 68, 68); // Primary red
  doc.text('SOS App - Emergency Report', pageWidth / 2, 20, { align: 'center' });

  // Emergency ID and Date
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Report ID: ${emergency.id}`, 14, 30);
  doc.text(`Generated: ${format(new Date(), 'MMM d, yyyy h:mm a')}`, 14, 35);

  // Emergency Details Section
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text('Emergency Details', 14, 50);

  const details = [
    ['Type', emergency.type],
    ['Status', emergency.status],
    [
      'Triggered At',
      format(new Date(emergency.triggeredAt), 'MMM d, yyyy h:mm:ss a'),
    ],
  ];

  if (emergency.resolvedAt) {
    details.push([
      'Resolved At',
      format(new Date(emergency.resolvedAt), 'MMM d, yyyy h:mm:ss a'),
    ]);

    const duration =
      new Date(emergency.resolvedAt).getTime() -
      new Date(emergency.triggeredAt).getTime();
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    details.push(['Duration', `${minutes}m ${seconds}s`]);
  }

  if (emergency.description) {
    details.push(['Description', emergency.description]);
  }

  autoTable(doc, {
    startY: 55,
    head: [],
    body: details,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 40 },
      1: { cellWidth: 'auto' },
    },
  });

  // @ts-ignore - autoTable adds finalY
  let currentY = doc.lastAutoTable.finalY + 10;

  // Contact Acknowledgments Section
  if (acknowledgments.length > 0) {
    doc.setFontSize(14);
    doc.text('Contact Acknowledgments', 14, currentY);

    const ackData = acknowledgments.map((ack) => [
      ack.contactName,
      format(new Date(ack.acknowledgedAt), 'MMM d, yyyy h:mm a'),
    ]);

    autoTable(doc, {
      startY: currentY + 5,
      head: [['Contact Name', 'Acknowledged At']],
      body: ackData,
      theme: 'striped',
      headStyles: { fillColor: [239, 68, 68] },
      styles: { fontSize: 10 },
    });

    // @ts-ignore
    currentY = doc.lastAutoTable.finalY + 10;
  }

  // Location Trail Section
  if (locationTrail.length > 0) {
    // Add new page if needed
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(14);
    doc.text('Location Trail', 14, currentY);

    const locationData = locationTrail.slice(0, 20).map((point) => [
      format(new Date(point.timestamp), 'h:mm:ss a'),
      `${point.latitude.toFixed(6)}`,
      `${point.longitude.toFixed(6)}`,
      `${point.accuracy.toFixed(0)}m`,
    ]);

    autoTable(doc, {
      startY: currentY + 5,
      head: [['Time', 'Latitude', 'Longitude', 'Accuracy']],
      body: locationData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9 },
    });

    if (locationTrail.length > 20) {
      // @ts-ignore
      currentY = doc.lastAutoTable.finalY + 5;
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(
        `Showing 20 of ${locationTrail.length} location points`,
        14,
        currentY
      );
    }
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
    doc.text(
      'SOS App - Emergency Alert System',
      14,
      doc.internal.pageSize.getHeight() - 10
    );
  }

  // Save the PDF
  const fileName = `emergency-report-${emergency.id}-${format(
    new Date(),
    'yyyy-MM-dd'
  )}.pdf`;
  doc.save(fileName);
}
