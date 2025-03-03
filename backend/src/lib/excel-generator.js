const ExcelJS = require('exceljs');
const translate = require('../translate');
const utils = require('./utils');
const CVSS31 = require('./cvsscalc31.js');
const Settings = require('mongoose').model('Settings');

let $t;

// Generate Excel document from audit data
async function generateExcel(audit) {
    console.log('Starting Excel generation for audit:', audit.name);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PwnDoc-NG';
    workbook.created = new Date();

    // Set translation
    translate.setLocale(audit.language);
    $t = translate.translate;

    // Get settings
    const settings = await Settings.getAll();
    
    // Debug log for audit data
    console.log('Audit data before prep:', JSON.stringify({
        findings: audit.findings?.length,
        language: audit.language,
        company: audit.company?.name
    }));

    const preppedAudit = await prepAuditData(audit, settings);
    
    // Debug log for prepped data
    console.log('Prepped audit data:', JSON.stringify({
        findings: preppedAudit.findings?.length,
        sampleFinding: preppedAudit.findings?.[0]
    }));

    // Create worksheets
    try {
        await createSummarySheet(workbook, preppedAudit);
        await createFindingsSheet(workbook, preppedAudit);
        await createStatisticsSheet(workbook, preppedAudit);

        // Generate buffer
        return await workbook.xlsx.writeBuffer();
    } catch (error) {
        console.error('Error during Excel generation:', error);
        throw error;
    }
}

// Create Summary worksheet
async function createSummarySheet(workbook, audit) {
    const worksheet = workbook.addWorksheet($t('Summary'));
    
    // Log audit data received by Excel generator
    console.log('Excel generator received audit data:', {
        name: audit.name,
        company: audit.company,
        date_start: audit.date_start,
        date_end: audit.date_end,
        auditType: audit.auditType,
        scope: audit.scope
    });

    // Format date if present, otherwise return empty string
    const formatDate = (date) => {
        if (!date) return '';
        try {
            return new Date(date).toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
        } catch (err) {
            console.error('Error formatting date:', err);
            return '';
        }
    };

    // Add company logo if exists
    if (audit.company && audit.company.logo) {
        const logoId = workbook.addImage({
            base64: audit.company.logo.split(',')[1],
            extension: 'png',
        });
        worksheet.addImage(logoId, {
            tl: { col: 0, row: 0 },
            ext: { width: 200, height: 100 }
        });
    }

    // Add audit information
    const rows = [
        ['', ''],  // Empty row after logo
        [$t('Audit Name'), audit.name],
        [$t('Client'), (audit.company?.name || audit.company || '')],
        [$t('Date Start'), formatDate(audit.date_start)],
        [$t('Date End'), formatDate(audit.date_end)],
        [$t('Audit Type'), audit.auditType || ''],
    ];

    // Log rows before adding to worksheet
    console.log('Excel rows to be added:', rows);

    // Add scope section
    rows.push([]);
    rows.push([$t('Scope')]);
    if (audit.scope && audit.scope.length > 0) {
        audit.scope.forEach(item => {
            rows.push(['', item.name]);
        });
    }

    // Add rows to worksheet
    rows.forEach(row => {
        worksheet.addRow(row);
    });

    // Format cells
    worksheet.columns.forEach((column, index) => {
        if (index === 0) {  // Labels column
            column.width = 15;
            column.font = { bold: true };
        } else {  // Values column
            column.width = 50;
        }
    });

    // Style date cells specifically
    const dateRows = [4, 5];  // Rows with dates (1-based)
    dateRows.forEach(rowNum => {
        const cell = worksheet.getCell(`B${rowNum}`);
        if (cell.value) {  // Only format if there's a date
            cell.numFmt = 'dd/mm/yyyy';
        }
    });

    // Basic formatting
    worksheet.getColumn(1).width = 20;
    worksheet.getColumn(2).width = 50;
}

// Create Findings worksheet
async function createFindingsSheet(workbook, audit) {
    console.log('Creating findings sheet with', audit.findings?.length, 'findings');
    
    const worksheet = workbook.addWorksheet($t('Findings'));
    
    // Add headers
    const headers = [
        'ID',
        $t('Title'),
        $t('Description'),
        $t('Remediation'),
        $t('Type'),
        $t('CVSS Vector'),
        $t('Status'),
        $t('Proof of Concept'),
        $t('Impact'),
        $t('Affected Systems'),
        $t('References')
    ];
    
    console.log('Adding headers:', headers);
    const headerRow = worksheet.addRow(headers);

    // Add findings
    if (!audit.findings || !Array.isArray(audit.findings)) {
        console.error('No findings array found in audit data');
        audit.findings = [];
    }

    audit.findings.forEach((finding, index) => {
        console.log(`Processing finding ${index + 1}:`, {
            title: finding.title,
            description: finding.description?.substring(0, 50) + '...',
            remediation: finding.remediation?.substring(0, 50) + '...',
            status: finding.status
        });
        
        const row = [
            finding.identifier || `${index + 1}`,
            finding.title || '',
            finding.description || '',
            finding.remediation || '',
            finding.vulnType || '',
            finding.cvssv3 || '',
            finding.status || '',
            finding.poc || '',
            finding.impact || '',
            Array.isArray(finding.affected) ? finding.affected.join(', ') : (finding.affected || ''),
            Array.isArray(finding.references) ? finding.references.join('\n') : (finding.references || '')
        ];
        
        console.log(`Adding row for finding ${index + 1}:`, {
            id: row[0],
            title: row[1],
            descriptionLength: row[2]?.length,
            remediationLength: row[3]?.length,
            status: row[6]
        });
        worksheet.addRow(row);
    });

    // Format columns
    worksheet.columns.forEach((column, index) => {
        let maxLength = 0;
        column.eachCell((cell) => {
            const length = cell.value ? cell.value.toString().length : 0;
            maxLength = Math.max(maxLength, length);
        });

        // Set specific widths based on column content
        switch (index) {
            case 0:  // ID
                column.width = 10;
                break;
            case 1:  // Title
                column.width = 50;
                column.alignment = { wrapText: true };
                break;
            case 2:  // Description
                column.width = 100;
                column.alignment = { wrapText: true };
                break;
            case 3:  // Remediation
                column.width = 100;
                column.alignment = { wrapText: true };
                break;
            case 4:  // Type
                column.width = Math.min(30, Math.max(15, maxLength));
                break;
            case 5:  // CVSS Vector
                column.width = 50;
                column.alignment = { horizontal: 'left' };
                break;
            case 6:  // Status
                column.width = 15;
                column.alignment = { horizontal: 'center' };
                break;
            default: // PoC, Impact, etc.
                column.width = Math.min(60, Math.max(30, maxLength));
                column.alignment = { wrapText: true };
        }
    });

    // Style header row
    headerRow.font = { bold: true };
    headerRow.alignment = { horizontal: 'center' };
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF808080' }  // Gris
    };
}

// Create Statistics worksheet with charts
async function createStatisticsSheet(workbook, audit) {
    const worksheet = workbook.addWorksheet($t('Statistics'));
    
    // Count vulnerabilities by severity
    const severityCounts = {
        'Critical': 0,
        'High': 0,
        'Medium': 0,
        'Low': 0,
        'Info': 0
    };

    audit.findings.forEach(finding => {
        const severity = finding.cvss?.baseSeverity || 'Info';
        severityCounts[severity]++;
    });

    // Add severity statistics
    worksheet.addRow([$t('Severity Distribution')]);
    worksheet.addRow([$t('Severity'), $t('Count')]);
    
    // Add data and format cells
    Object.entries(severityCounts).forEach(([severity, count], index) => {
        const row = worksheet.addRow([severity, count]);
        const severityColors = {
            'Critical': 'FF0000',
            'High': 'FF8000',
            'Medium': 'FFFF00',
            'Low': '00FF00',
            'Info': '808080'
        };
        
        // Color the severity cell
        row.getCell(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: severityColors[severity] }
        };
    });

    // Format headers
    worksheet.getRow(1).font = { bold: true, size: 14 };
    worksheet.getRow(2).font = { bold: true };
    
    // Auto-fit columns
    worksheet.columns.forEach(column => {
        column.width = Math.max(20, ...worksheet.getColumn(column.number).values
            .filter(value => value)
            .map(value => value.toString().length));
    });

    // Add totals
    worksheet.addRow([]);
    const totalRow = worksheet.addRow(['Total', Object.values(severityCounts).reduce((a, b) => a + b, 0)]);
    totalRow.font = { bold: true };
}

// Prepare audit data
async function prepAuditData(data, settings) {
    // Clone data to avoid modifying the original
    var audit = JSON.parse(JSON.stringify(data));

    // Ensure findings array exists
    audit.findings = audit.findings || [];

    // Format findings data
    audit.findings.forEach((finding, index) => {
        // Ensure all fields exist with default values
        finding.identifier = finding.identifier || `${index + 1}`;
        finding.title = finding.title || '';
        finding.vulnType = typeof finding.vulnType === 'string' ? finding.vulnType : (finding.vulnType?.name || '');
        finding.status = typeof finding.status === 'string' ? finding.status : (finding.status?.name || '');
        finding.category = typeof finding.category === 'string' ? finding.category : (finding.category?.name || '');
        finding.description = finding.description || '';
        finding.poc = finding.poc || '';
        finding.impact = finding.impact || '';
        finding.remediationText = finding.remediationText || '';

        // Handle arrays
        if (finding.affected) {
            finding.affected = Array.isArray(finding.affected) ? finding.affected.join(', ') : finding.affected;
        } else {
            finding.affected = '';
        }

        if (finding.references) {
            finding.references = Array.isArray(finding.references) ? finding.references.join('\n') : finding.references;
        } else {
            finding.references = '';
        }

        // Handle CVSS
        if (!finding.cvss) {
            finding.cvss = {
                baseScore: '',
                baseSeverity: 'Info'
            };
        }
    });

    return audit;
}

module.exports = {
    generateExcel
};
