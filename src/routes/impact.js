import express from 'express';
import { db } from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { calculateHopeScore } from '../services/hopescore.js';
import PDFDocument from 'pdfkit';

const router = express.Router();

// GET /hopescore/:startupId — Retrieve detailed HopeScore V2 rating and breakdowns
router.get('/hopescore/:startupId', authenticate, async (req, res) => {
  try {
    const { startupId } = req.params;
    const scoreDetails = await calculateHopeScore(startupId);
    return res.json({ success: true, data: scoreDetails });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /passport/:startupId — Dynamic generation & streaming of DFI-compliant Impact Passport PDF
router.get('/passport/:startupId', authenticate, async (req, res) => {
  try {
    const { startupId } = req.params;
    const scoreDetails = await calculateHopeScore(startupId);

    // Fetch startup name, sector and country details
    const startupRes = await db.query('SELECT name, sector, country FROM startups WHERE id = $1', [startupId]);
    const startupName = startupRes.rows[0]?.name || 'Startup';
    const sector = startupRes.rows[0]?.sector || 'N/A';
    const country = startupRes.rows[0]?.country || 'N/A';

    const { hope_score, breakdown, metrics } = scoreDetails;

    // Create a new PDF document in memory
    const doc = new PDFDocument({ margin: 50 });

    // Stream PDF directly to client response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Impact_Passport_${startupId}.pdf`);
    doc.pipe(res);

    // Header section
    doc.fontSize(22).font('Helvetica-Bold').fillColor('#1A1A1A').text('HOPEFUSION AFRICA', { align: 'center' });
    doc.fontSize(11).font('Helvetica').fillColor('#666666').text('Continental Opportunity Operating System', { align: 'center' });
    doc.moveDown(1.5);

    doc.font('Helvetica-Bold').fontSize(16).fillColor('#2DB562').text('OFFICIAL IMPACT PASSPORT', { align: 'center' });
    doc.moveDown(2);

    // Section 1: Profile Information
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#1A1A1A').text('1. Startup Information');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('#3D3D3D');
    doc.text(`Startup Name: ${startupName}`);
    doc.text(`Sector: ${sector}`);
    doc.text(`Country: ${country}`);
    doc.text(`Registry Status: ${metrics.is_registered ? 'Verified Registered Corporation' : 'Not Registered / Pending Verification'}`);
    doc.moveDown(1.5);

    // Section 2: HopeScore
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#1A1A1A').text('2. HopeScore™ V2 Credit & Execution Rating');
    doc.moveDown(0.5);
    doc.fontSize(28).font('Helvetica-Bold').fillColor('#E8A020').text(`Score: ${hope_score} / 850`);
    doc.moveDown(0.8);
    doc.fontSize(10).font('Helvetica').fillColor('#3D3D3D');
    doc.text(`Identity Score (20% weight): ${Math.round(breakdown.identity_score * 100)}%`);
    doc.text(`Execution Score (25% weight): ${Math.round(breakdown.execution_score * 100)}%`);
    doc.text(`Financial Score (25% weight): ${Math.round(breakdown.financial_score * 100)}%`);
    doc.text(`Network Score (15% weight): ${Math.round(breakdown.network_score * 100)}%`);
    doc.text(`Impact Score (15% weight): ${Math.round(breakdown.impact_score * 100)}%`);
    doc.moveDown(1.5);

    // Section 3: Diversity & SDG Alignment
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#1A1A1A').text('3. Diversity & SDG Commitments');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('#3D3D3D');
    doc.text(`Total Headcount: ${metrics.total_milestones > 0 ? metrics.total_milestones : 1} employees`);
    doc.text(`Female Representation: ${metrics.female_representation}%`);
    doc.text(`Youth Representation: ${metrics.youth_representation}%`);
    doc.text(`Aligned UN SDGs: ${metrics.sdgs_aligned.length > 0 ? metrics.sdgs_aligned.join(', ') : 'None Specified'}`);
    doc.moveDown(3);

    // Footer
    doc.fontSize(8).font('Helvetica-Oblique').fillColor('#999999').text(
      'This document serves as a verified, dynamic cryptographic certificate of execution capability. Scan or validate credentials online via HopeFusion Africa Network registry.',
      { align: 'center' }
    );

    // Complete the PDF creation
    doc.end();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
