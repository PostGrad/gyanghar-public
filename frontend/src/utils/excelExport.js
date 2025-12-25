import * as XLSX from 'xlsx';

export const exportToExcel = (entries, summary, studentInfo, dateRange, columnOrder, visibleColumns) => {
  const formatTime = (timeStr) => {
    if (!timeStr) return "-";
    return new Date(`2000-01-01T${timeStr}`).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDuration = (timeStr) => {
    if (!timeStr) return "-";
    const [hours, minutes] = timeStr.split(":");
    const h = parseInt(hours);
    const m = parseInt(minutes);
    if (h === 0 && m === 0) return "0 m";
    if (h === 0) return `${m} m`;
    if (m === 0) return `${h} h`;
    return `${h} h ${m} m`;
  };

  const getYesNo = (value) => (value ? "Yes" : "No");

  const getKathaValue = (value) => {
    if (value === "zoom") return "Zoom";
    if (value === "youtube") return "YouTube";
    return "No";
  };

  const getMeditationValue = (entry) => {
    const meditationMinutes = entry.meditation_watch_time || 0;
    const isOldEntry = entry.mast_meditation && meditationMinutes === 0;
    if (isOldEntry) return "Yes";
    if (meditationMinutes > 0) return `${meditationMinutes} min`;
    return "No";
  };

  // Prepare header info
  const headerData = [];
  if (studentInfo) {
    headerData.push([`Name: ${studentInfo.name}`]);
    if (studentInfo.mobile) {
      headerData.push([`Mobile: ${studentInfo.mobile}`]);
    }
  }
  headerData.push([`Date Range: ${dateRange.from} to ${dateRange.to}`]);
  headerData.push([]); // Empty row

  // Prepare column headers based on visible columns
  const headers = [];
  const columnMap = {
    entryDate: "Date",
    wakeupTime: "Wake Up Time",
    mangalaAarti: "Mangala Aarti",
    morningKatha: "Morning Katha",
    pujaTime: "Puja Time",
    vachanamrut: "Vachanamrut",
    meditation: "Meditation",
    cheshta: "Cheshta",
    mansiPuja: "Mansi Puja",
    readingTime: "Reading Time",
    wastedTime: "Wasted Time",
    mantraJap: "Mantra Jap",
    notes: "Notes",
  };

  columnOrder.filter(key => visibleColumns[key]).forEach(key => {
    headers.push(columnMap[key] || key);
  });

  // Prepare data rows
  const dataRows = entries.filter(e => !e.isMissing).map(entry => {
    const row = [];
    columnOrder.filter(key => visibleColumns[key]).forEach(key => {
      switch(key) {
        case "entryDate":
          row.push(new Date(entry.entry_date).toLocaleDateString("en-GB"));
          break;
        case "wakeupTime":
          row.push(formatTime(entry.wakeup_time));
          break;
        case "mangalaAarti":
          row.push(getYesNo(entry.mangala_aarti));
          break;
        case "morningKatha":
          row.push(getKathaValue(entry.morning_katha));
          break;
        case "pujaTime":
          row.push(formatDuration(entry.morning_puja_time));
          break;
        case "vachanamrut":
          row.push(getYesNo(entry.vachanamrut_read));
          break;
        case "meditation":
          row.push(getMeditationValue(entry));
          break;
        case "cheshta":
          row.push(getYesNo(entry.cheshta));
          break;
        case "mansiPuja":
          row.push(entry.mansi_puja_count || "0");
          break;
        case "readingTime":
          row.push(formatDuration(entry.reading_time));
          break;
        case "wastedTime":
          row.push(formatDuration(entry.wasted_time));
          break;
        case "mantraJap":
          row.push(entry.mantra_jap || "0");
          break;
        case "notes":
          row.push(entry.notes || "-");
          break;
        default:
          row.push("-");
      }
    });
    return row;
  });

  // Add summary row if available
  if (summary) {
    const summaryRow = [];
    columnOrder.filter(key => visibleColumns[key]).forEach(key => {
      switch(key) {
        case "entryDate":
          summaryRow.push(`Summary (${summary.count} ${summary.count === 1 ? 'day' : 'days'})`);
          break;
        case "wakeupTime":
          summaryRow.push(formatTime(summary.avgWakeupTime));
          break;
        case "mangalaAarti":
          summaryRow.push(`${summary.mangalaAartiCount} / ${summary.count}`);
          break;
        case "morningKatha":
          summaryRow.push(`Z: ${summary.kathaZoom}, Y: ${summary.kathaYoutube}, M: ${summary.kathaMissed}`);
          break;
        case "pujaTime":
          const pujaHours = Math.floor(summary.avgPujaMinutes / 60);
          const pujaMins = summary.avgPujaMinutes % 60;
          summaryRow.push(pujaHours > 0 ? `${pujaHours} h ${pujaMins} m` : `${pujaMins} m`);
          break;
        case "vachanamrut":
          summaryRow.push(`${summary.vachanamrutCount} / ${summary.count}`);
          break;
        case "meditation":
          const medHours = Math.floor(summary.meditationSum / 60);
          const medMins = summary.meditationSum % 60;
          summaryRow.push(medHours > 0 ? `${medHours} h ${medMins} m` : `${medMins} m`);
          break;
        case "cheshta":
          summaryRow.push(`${summary.cheshtaCount} / ${summary.count}`);
          break;
        case "mansiPuja":
          summaryRow.push(`${summary.mansiPujaSum} / ${summary.mansiPujaMax}`);
          break;
        case "readingTime":
          const readHours = Math.floor(summary.readingSum / 60);
          const readMins = summary.readingSum % 60;
          summaryRow.push(readHours > 0 ? `${readHours} h ${readMins} m` : `${readMins} m`);
          break;
        case "wastedTime":
          const wasteHours = Math.floor(summary.wastedSum / 60);
          const wasteMins = summary.wastedSum % 60;
          summaryRow.push(wasteHours > 0 ? `${wasteHours} h ${wasteMins} m` : `${wasteMins} m`);
          break;
        case "mantraJap":
          summaryRow.push(summary.mantraJapSum);
          break;
        default:
          summaryRow.push("-");
      }
    });
    dataRows.push(summaryRow);
  }

  // Combine all data
  const worksheetData = [
    ...headerData,
    headers,
    ...dataRows,
  ];

  // Create workbook and worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Report");

  // Generate filename
  const filename = `Accountability_Report_${dateRange.from}_to_${dateRange.to}.xlsx`;

  // Download file
  XLSX.writeFile(workbook, filename);
};

