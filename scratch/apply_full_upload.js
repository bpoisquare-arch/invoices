const fs = require('fs');
const crypto = require('crypto');
const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function cleanString(val) {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  if (str === 'null' || str === 'undefined') return '';
  return str;
}

function cleanNumber(val) {
  if (val === null || val === undefined || val === '' || val === '-') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val).replace(/[^0-9.-]/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

function cleanScholarshipNumber(val) {
  if (val === null || val === undefined || val === '' || val === '-') return 0;
  if (typeof val === 'number') {
    if (isNaN(val) || val <= 0) return 0;
    return val;
  }
  const str = String(val).trim();
  if (!str) return 0;
  if (
    str.includes('GMT') ||
    str.includes('T00:00') ||
    /^\d{4}-\d{2}-\d{2}/.test(str) ||
    /^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/.test(str)
  ) {
    return 0;
  }
  const cleaned = str.replace(/[^0-9.-]/g, '');
  const num = parseFloat(cleaned);
  if (isNaN(num) || num <= 0) return 0;
  if (num > 100000) return 0;
  return num;
}

// Convert any date format to standard DD/MM/YY
function formatExcelDate(val) {
  if (!val && val !== 0) return '';
  if (typeof val === 'number') {
    try {
      const dateObj = XLSX.SSF.parse_date_code(val);
      if (dateObj) {
        const d = String(dateObj.d).padStart(2, '0');
        const m = String(dateObj.m).padStart(2, '0');
        const y = String(dateObj.y).slice(-2);
        return `${d}/${m}/${y}`;
      }
    } catch {
      return String(val);
    }
  }

  const str = String(val).trim();
  if (!str || str === '-') return '';

  // 1. Match YYYY-MM-DD
  const ymdMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ymdMatch) {
    const year = ymdMatch[1].slice(-2);
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${day}/${month}/${year}`;
  }

  // 2. Match DD/MM/YYYY or DD-MM-YYYY
  const dmy4Match = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dmy4Match) {
    const day = dmy4Match[1].padStart(2, '0');
    const month = dmy4Match[2].padStart(2, '0');
    const year = dmy4Match[3].slice(-2);
    return `${day}/${month}/${year}`;
  }

  // 3. Match DD/MM/YY or DD-MM-YY
  const dmy2Match = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2})$/);
  if (dmy2Match) {
    const day = dmy2Match[1].padStart(2, '0');
    const month = dmy2Match[2].padStart(2, '0');
    const year = dmy2Match[3];
    return `${day}/${month}/${year}`;
  }

  return str;
}

function normalizeDocumentType(doc) {
  if (!doc) return null;
  const trimmed = doc.trim();
  if (!trimmed) return null;
  const d = trimmed.toLowerCase();
  if (d.includes('cnic') || d.includes('nic') || d.includes('national id')) return 'CNIC';
  if (d.includes('coe')) return 'CoE';
  if (d.includes('voe')) return 'VoE';
  if (d.includes('offer')) return 'Offer Letter';
  if (d.includes('passport')) return 'Passport';
  return trimmed;
}

function parseFile(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const rowStr = rows[i].map((c) => String(c).toLowerCase()).join(' ');
    if (rowStr.includes('student name') || rowStr.includes('agent') || rowStr.includes('pending invoice') || rowStr.includes('sr no')) {
      headerRowIndex = i;
      break;
    }
  }

  const headerRow = rows[headerRowIndex].map((h) => cleanString(h));
  const rawHeaders = headerRow.filter(Boolean);

  const findColIndex = (keywords) => {
    return headerRow.findIndex((h) => {
      const lower = h.toLowerCase();
      return keywords.some((k) => lower.includes(k.toLowerCase()));
    });
  };

  const idxSrNo = findColIndex(['sr no', 'sr.no', 'sr#', 'serial', 's.no']);
  const idxStudentName = findColIndex(['student name', 'name', 'student']);
  const idxStudentId = findColIndex(['student id', 'student_id', 'id no', 'id']);
  const idxAgent = findColIndex(['agent', 'counselor', 'consultant']);
  const idxScholarship = findColIndex(['scholarship']);
  const idxPendingInvoice = findColIndex(['pending invoice', 'invoice no', 'invoice']);
  const idxPendingAmount = findColIndex(['pending amount', 'balance', 'pending']);
  const idxYetToRaised = findColIndex(['yet to raised', 'yet to raise', 'unraised']);
  const idxRemarks = findColIndex(['remarks', 'notes', 'comment']);
  const idxDob = findColIndex(['dob', 'date of birth', 'birth date']);
  const idxDocument = findColIndex(['document', 'doc type', 'cnic', 'passport']);
  const idxStatus = findColIndex(['status', 'student status']);
  const idxIntake = findColIndex(['intake', 'batch', 'session']);
  const idxEndDate = findColIndex(['end date', 'completion date', 'finish date']);
  const idxCourse = findColIndex(['course', 'program', 'qualification']);

  const idxAdminFee = findColIndex(['admin fee', 'admission fee']);
  const idxResourceFee = findColIndex(['resource fee', 'material fee', 'resources']);
  const idxTuitionFee = findColIndex(['tuition fee', 'tuition']);
  const idxTotalFee = findColIndex(['total fee', 'course fee', 'total amount']);
  const idxPaidAmount = findColIndex(['paid amount', 'initial payment', 'deposit', 'paid']);
  const idxTotalPaid = findColIndex(['total paid', 'total received']);
  const idxFollowUp = findColIndex(['follow up', 'followup', 'next action']);
  const idxCoeIssuedDate = findColIndex(['coe issue date', 'coe issued date', 'coe date', 'coe issued', 'coe']);
  const idxEmailId = findColIndex(['email id', 'email', 'e-mail']);
  const idxPhoneNo = findColIndex(['phone no', 'phone', 'contact', 'mobile']);
  const idxPaymentStatus = findColIndex(['payment status', 'pay status']);
  const idxDividedMonth = findColIndex(['divided month', 'divided months', 'dividedmonth', 'months divided']);
  const idxCalculationBreakup = findColIndex(['calculation breakup', 'calculation break up', 'calc breakup', 'calculation']);

  const records = [];

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((cell) => cell === '' || cell === null || cell === undefined)) {
      continue;
    }

    const studentName = idxStudentName !== -1 ? cleanString(row[idxStudentName]) : '';
    if (!studentName) continue;

    const srNo = idxSrNo !== -1 ? (cleanNumber(row[idxSrNo]) || i - headerRowIndex) : i - headerRowIndex;
    const studentId = idxStudentId !== -1 ? cleanString(row[idxStudentId]) : '';
    const agent = idxAgent !== -1 ? cleanString(row[idxAgent]) : '';
    const scholarship = idxScholarship !== -1 ? cleanString(row[idxScholarship]) : '';
    const pendingInvoice = idxPendingInvoice !== -1 ? cleanString(row[idxPendingInvoice]) : '';
    const pendingAmount = idxPendingAmount !== -1 ? cleanNumber(row[idxPendingAmount]) : 0;
    let yetToRaised = idxYetToRaised !== -1 ? cleanString(row[idxYetToRaised]) : '';
    const remarks = idxRemarks !== -1 ? cleanString(row[idxRemarks]) : '';
    const dob = idxDob !== -1 ? formatExcelDate(row[idxDob]) : '';
    const document = idxDocument !== -1 ? (normalizeDocumentType(cleanString(row[idxDocument])) || '') : '';
    const status = idxStatus !== -1 ? (cleanString(row[idxStatus]) || 'Current') : 'Current';
    const intake = idxIntake !== -1 ? formatExcelDate(row[idxIntake]) : '';
    const endDate = idxEndDate !== -1 ? formatExcelDate(row[idxEndDate]) : '';
    const course = idxCourse !== -1 ? cleanString(row[idxCourse]) : '';

    const adminFee = idxAdminFee !== -1 ? cleanNumber(row[idxAdminFee]) : 0;
    const resourceFee = idxResourceFee !== -1 ? cleanNumber(row[idxResourceFee]) : 0;
    const tuitionFee = idxTuitionFee !== -1 ? cleanNumber(row[idxTuitionFee]) : 0;
    const grossFee = adminFee + resourceFee + tuitionFee;
    const scholarshipNum = cleanScholarshipNumber(scholarship);

    let totalFee = idxTotalFee !== -1 ? cleanNumber(row[idxTotalFee]) : 0;
    if (scholarshipNum > 0) {
      if (grossFee > 0) {
        const netFee = Math.max(0, grossFee - scholarshipNum);
        if (totalFee === 0 || Math.abs(totalFee - grossFee) < 1 || totalFee > netFee) {
          totalFee = netFee;
        }
      } else if (totalFee > 0) {
        totalFee = Math.max(0, totalFee - scholarshipNum);
      }
    } else {
      if (totalFee === 0 && grossFee > 0) {
        totalFee = grossFee;
      }
    }

    const paidAmount = idxPaidAmount !== -1 ? cleanNumber(row[idxPaidAmount]) : 0;
    const totalPaid = idxTotalPaid !== -1 ? cleanNumber(row[idxTotalPaid]) : paidAmount;
    if (totalFee > 0) {
      const computedYet = Math.max(0, Math.round((totalFee - (totalPaid + pendingAmount)) * 100) / 100);
      if (!yetToRaised || (scholarshipNum > 0 && Math.abs(cleanNumber(yetToRaised) - (grossFee - (totalPaid + pendingAmount))) < 1)) {
        yetToRaised = String(computedYet);
      }
    }
    const followUp = idxFollowUp !== -1 ? cleanString(row[idxFollowUp]) : '';
    const coeIssuedDate = idxCoeIssuedDate !== -1 ? formatExcelDate(row[idxCoeIssuedDate]) : '';
    const emailId = idxEmailId !== -1 ? cleanString(row[idxEmailId]) : '';
    const phoneNo = idxPhoneNo !== -1 ? cleanString(row[idxPhoneNo]) : '';
    const paymentStatus = idxPaymentStatus !== -1 ? cleanString(row[idxPaymentStatus]) : (pendingAmount > 0 ? 'Pending' : 'Paid');
    const dividedMonth = idxDividedMonth !== -1 ? (cleanNumber(row[idxDividedMonth]) || null) : null;
    const calculationBreakup = idxCalculationBreakup !== -1 ? cleanString(row[idxCalculationBreakup]) : '';

    const extra_data = {};
    headerRow.forEach((colName, cIdx) => {
      if (colName && row[cIdx] !== undefined && row[cIdx] !== '') {
        extra_data[colName] = row[cIdx];
      }
    });

    if (dividedMonth !== null && dividedMonth > 0) {
      extra_data.divided_month = dividedMonth;
    }
    if (calculationBreakup) {
      extra_data.calculation_breakup = calculationBreakup;
    }

    records.push({
      srNo,
      studentName,
      studentId,
      agent,
      scholarship,
      pendingInvoice,
      pendingAmount,
      yetToRaised,
      remarks,
      dob,
      document,
      status,
      intake,
      endDate,
      course,
      adminFee,
      resourceFee,
      tuitionFee,
      totalFee,
      paidAmount,
      totalPaid,
      followUp,
      coeIssuedDate,
      emailId,
      phoneNo,
      paymentStatus,
      dividedMonth,
      calculationBreakup,
      extraData: extra_data,
    });
  }

  return { rawHeaders, records };
}

async function main() {
  console.log('--- Starting STC Report Data Upload & Fix ---');

  // 1. Process STC_Student_Report_2026-11-09-31th.xlsx (31 records)
  const file1Path = 'scratch/STC_Student_Report_2026-11-09-31th.xlsx';
  const { records: records1 } = parseFile(file1Path);
  console.log(`Parsed ${records1.length} records from ${file1Path}`);

  // Fetch current 31 records in DB
  const existingDbRecords = await prisma.stcReportRecord.findMany();
  console.log(`Found ${existingDbRecords.length} existing records in DB.`);

  let updatedCount1 = 0;
  for (const r of records1) {
    const studentIdKey = r.studentId ? r.studentId.trim().toLowerCase() : '';
    const nameKey = r.studentName ? r.studentName.trim().toLowerCase() : '';

    const match = existingDbRecords.find((dbR) => {
      if (studentIdKey && dbR.studentId && dbR.studentId.trim().toLowerCase() === studentIdKey) return true;
      if (nameKey && dbR.studentName && dbR.studentName.trim().toLowerCase() === nameKey) return true;
      return false;
    });

    if (match) {
      await prisma.stcReportRecord.update({
        where: { id: match.id },
        data: {
          coeIssuedDate: r.coeIssuedDate || null,
          intake: r.intake || match.intake,
          endDate: r.endDate || match.endDate,
          dob: r.dob || match.dob,
          course: r.course || match.course,
          agent: r.agent || match.agent,
          adminFee: r.adminFee,
          resourceFee: r.resourceFee,
          tuitionFee: r.tuitionFee,
          totalFee: r.totalFee,
          paidAmount: r.paidAmount,
          totalPaid: r.totalPaid,
          pendingAmount: r.pendingAmount,
          yetToRaised: r.yetToRaised,
          extraData: {
            ...((match.extraData) || {}),
            ...(r.extraData || {}),
            coe_issued_date: r.coeIssuedDate || null,
          },
        },
      });
      updatedCount1++;
    } else {
      // Record not present, insert it
      const newId = crypto.randomUUID();
      const importId = existingDbRecords[0]?.importId || crypto.randomUUID();
      await prisma.stcReportRecord.create({
        data: {
          id: newId,
          importId,
          srNo: r.srNo,
          studentName: r.studentName,
          studentId: r.studentId || null,
          agent: r.agent || null,
          scholarship: r.scholarship || null,
          pendingInvoice: r.pendingInvoice || null,
          pendingAmount: r.pendingAmount || 0,
          yetToRaised: r.yetToRaised || null,
          remarks: r.remarks || null,
          dob: r.dob || null,
          document: r.document || null,
          status: r.status || 'Current',
          intake: r.intake || null,
          endDate: r.endDate || null,
          course: r.course || null,
          adminFee: r.adminFee || 0,
          resourceFee: r.resourceFee || 0,
          tuitionFee: r.tuitionFee || 0,
          totalFee: r.totalFee || 0,
          paidAmount: r.paidAmount || 0,
          totalPaid: r.totalPaid || 0,
          followUp: r.followUp || null,
          coeIssuedDate: r.coeIssuedDate || null,
          emailId: r.emailId || null,
          phoneNo: r.phoneNo || null,
          paymentStatus: r.paymentStatus || 'Current',
          dividedMonth: r.dividedMonth || null,
          calculationBreakup: r.calculationBreakup || null,
          extraData: r.extraData || {},
        },
      });
      updatedCount1++;
    }
  }
  console.log(`Updated / verified ${updatedCount1} records from ${file1Path}`);

  // 2. Process Final STC-1.xlsx (68 records)
  const file2Path = 'scratch/Final STC-1.xlsx';
  const file2Stats = fs.statSync(file2Path);
  const file2Base64 = fs.readFileSync(file2Path).toString('base64');
  const { rawHeaders: headers2, records: records2 } = parseFile(file2Path);
  console.log(`Parsed ${records2.length} records from ${file2Path}`);

  // Calculate totals for import batch
  const totalPendingAmount2 = records2.reduce((sum, r) => sum + (r.pendingAmount || 0), 0);
  const totalYetToRaised2 = records2.reduce((sum, r) => sum + (cleanNumber(r.yetToRaised) || 0), 0);

  const importBatchId2 = crypto.randomUUID();
  await prisma.stcReportImport.create({
    data: {
      id: importBatchId2,
      fileName: 'Final STC-1.xlsx',
      fileSize: BigInt(file2Stats.size),
      uploadedAt: new Date(),
      uploadedBy: 'admin@isquarebpo.com',
      totalRecords: records2.length,
      totalPendingAmount: totalPendingAmount2,
      totalYetToRaised: totalYetToRaised2,
      entity: 'stc',
      originalFileData: file2Base64,
      rawHeaders: headers2,
    },
  });
  console.log(`Created StcReportImport batch: ${importBatchId2}`);

  // Fetch updated records in DB to determine next Sr No
  const allCurrentDbRecords = await prisma.stcReportRecord.findMany();
  let maxSr = allCurrentDbRecords.reduce((m, r) => Math.max(m, r.srNo || 0), 0);

  let insertedCount2 = 0;
  for (const r of records2) {
    const studentIdKey = r.studentId ? r.studentId.trim().toLowerCase() : '';
    const nameKey = r.studentName ? r.studentName.trim().toLowerCase() : '';

    const existingMatch = allCurrentDbRecords.find((dbR) => {
      if (studentIdKey && dbR.studentId && dbR.studentId.trim().toLowerCase() === studentIdKey) return true;
      if (nameKey && dbR.studentName && dbR.studentName.trim().toLowerCase() === nameKey) return true;
      return false;
    });

    if (existingMatch) {
      // Overwrite / update existing
      await prisma.stcReportRecord.update({
        where: { id: existingMatch.id },
        data: {
          coeIssuedDate: r.coeIssuedDate || null,
          intake: r.intake || existingMatch.intake,
          endDate: r.endDate || existingMatch.endDate,
          dob: r.dob || existingMatch.dob,
          course: r.course || existingMatch.course,
          agent: r.agent || existingMatch.agent,
          adminFee: r.adminFee,
          resourceFee: r.resourceFee,
          tuitionFee: r.tuitionFee,
          totalFee: r.totalFee,
          paidAmount: r.paidAmount,
          totalPaid: r.totalPaid,
          pendingAmount: r.pendingAmount,
          yetToRaised: r.yetToRaised,
          extraData: {
            ...((existingMatch.extraData) || {}),
            ...(r.extraData || {}),
            coe_issued_date: r.coeIssuedDate || null,
          },
        },
      });
      insertedCount2++;
    } else {
      maxSr++;
      const recId = crypto.randomUUID();
      await prisma.stcReportRecord.create({
        data: {
          id: recId,
          importId: importBatchId2,
          srNo: maxSr,
          studentName: r.studentName,
          studentId: r.studentId || null,
          agent: r.agent || null,
          scholarship: r.scholarship || null,
          pendingInvoice: r.pendingInvoice || null,
          pendingAmount: r.pendingAmount || 0,
          yetToRaised: r.yetToRaised || null,
          remarks: r.remarks || null,
          dob: r.dob || null,
          document: r.document || null,
          status: r.status || 'Current',
          intake: r.intake || null,
          endDate: r.endDate || null,
          course: r.course || null,
          adminFee: r.adminFee || 0,
          resourceFee: r.resourceFee || 0,
          tuitionFee: r.tuitionFee || 0,
          totalFee: r.totalFee || 0,
          paidAmount: r.paidAmount || 0,
          totalPaid: r.totalPaid || 0,
          followUp: r.followUp || null,
          coeIssuedDate: r.coeIssuedDate || null,
          emailId: r.emailId || null,
          phoneNo: r.phoneNo || null,
          paymentStatus: r.paymentStatus || 'Current',
          dividedMonth: r.dividedMonth || null,
          calculationBreakup: r.calculationBreakup || null,
          extraData: r.extraData || {},
        },
      });
      insertedCount2++;
    }
  }
  console.log(`Inserted / updated ${insertedCount2} records for Final STC-1.xlsx`);

  // Verification
  const finalTotal = await prisma.stcReportRecord.count();
  console.log(`--- Verification: Total STC Records now in DB: ${finalTotal} ---`);

  const coeCount = await prisma.stcReportRecord.count({
    where: {
      AND: [
        { coeIssuedDate: { not: null } },
        { coeIssuedDate: { not: '' } },
        { coeIssuedDate: { not: '-' } }
      ]
    }
  });
  console.log(`Records with non-empty COE Issue Date: ${coeCount} / ${finalTotal}`);

  const sampleCheck = await prisma.stcReportRecord.findMany({
    take: 6,
    select: {
      srNo: true,
      studentName: true,
      studentId: true,
      intake: true,
      endDate: true,
      coeIssuedDate: true,
      dob: true,
    },
    orderBy: { createdAt: 'desc' }
  });
  console.log('Sample newly created/updated records:', sampleCheck);
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

