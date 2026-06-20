import { db } from '../config/db.js';

/**
 * Calculates HopeScore V2 for a given startup.
 * The score ranges between 300 and 850 based on 5 category weights.
 * 
 * @param {string} startupId 
 * @returns {Promise<object>}
 */
export async function calculateHopeScore(startupId) {
  if (!startupId) {
    throw new Error('startupId is required');
  }

  // 1. Fetch startup profile, joined with graph node & V4 profile columns if available
  const startupRes = await db.query(
    `SELECT 
       s.id AS startup_id,
       s.name,
       s.founder_id,
       s.sector,
       s.country,
       s.stage,
       n.id AS startup_node_id,
       (n.properties->>'reputation_score')::numeric AS reputation_score,
       p.monthly_recurring_revenue,
       p.annual_recurring_revenue,
       p.headcount,
       p.female_representation_percentage,
       p.youth_representation_percentage,
       p.sdg_alignment_targets,
       p.is_registered_incorporation,
       p.registry_number,
       p.incorporation_country
     FROM startups s
     LEFT JOIN graph_nodes n ON n.entity_type = 'startup' AND (n.properties->>'startup_id') = s.id::text
     LEFT JOIN startup_profiles_v4 p ON p.startup_node_id = n.id
     WHERE s.id = $1`,
    [startupId]
  );

  if (!startupRes.rows.length) {
    throw new Error('Startup profile not found');
  }

  const row = startupRes.rows[0];

  // --- Category 1: Identity & KYB (20%) ---
  const isRegistered = row.is_registered_incorporation || false;
  const iScore = isRegistered ? 1.0 : 0.0;

  // Fetch Milestones count if graph node exists
  let completedMilestones = 0;
  let totalMilestones = 0;

  if (row.startup_node_id) {
    const milestoneRes = await db.query(
      `SELECT 
         COUNT(*) FILTER (WHERE status = 'approved') AS completed,
         COUNT(*) AS total
       FROM escrow_milestones_v4 m
       JOIN platform_escrows_v4 e ON m.escrow_id = e.id
       WHERE e.startup_node_id = $1`,
      [row.startup_node_id]
    );
    if (milestoneRes.rows.length) {
      completedMilestones = parseInt(milestoneRes.rows[0].completed || 0);
      totalMilestones = parseInt(milestoneRes.rows[0].total || 0);
    }
  }

  // --- Category 2: Execution Metrics (25%) ---
  const eScore = totalMilestones > 0 ? (completedMilestones / totalMilestones) : 1.0;

  // --- Category 3: Financial Health (25%) ---
  const repaymentRatio = totalMilestones > 0 ? (completedMilestones / totalMilestones) : 1.0;
  const mrr = parseFloat(row.monthly_recurring_revenue || 0.0);
  const revTerm = Math.min(1.0, Math.log(Math.max(1.0, mrr)) / Math.log(100000));
  const fScore = (0.5 * repaymentRatio) + (0.5 * revTerm);

  // --- Category 4: Network & PageRank Activity (15%) ---
  const repScore = row.reputation_score ? parseFloat(row.reputation_score) : null;
  let nScore = 0.5; // Default neutral score

  if (repScore !== null) {
    const avgRankRes = await db.query(
      `SELECT AVG((properties->>'reputation_score')::numeric) AS avg_rank FROM graph_nodes`
    );
    const avgRank = parseFloat(avgRankRes.rows[0]?.avg_rank || 0.0001);
    nScore = Math.min(1.0, repScore / (avgRank * 2));
  }

  // --- Category 5: Impact & SDGs (15%) ---
  const femalePct = parseFloat(row.female_representation_percentage || 0.0);
  const youthPct = parseFloat(row.youth_representation_percentage || 0.0);
  const sdgs = row.sdg_alignment_targets || [];
  
  const mScore = (0.33 * (femalePct / 100)) + 
                 (0.33 * (youthPct / 100)) + 
                 (0.34 * (sdgs.length / 17));

  // --- Composite HopeScore V2 Calculation ---
  const composite = (0.20 * iScore) + 
                    (0.25 * eScore) + 
                    (0.25 * fScore) + 
                    (0.15 * nScore) + 
                    (0.15 * Math.min(1.0, mScore));

  const hopeScore = Math.round(300 + 550 * composite);

  return {
    hope_score: hopeScore,
    breakdown: {
      identity_score: parseFloat(iScore.toFixed(3)),
      execution_score: parseFloat(eScore.toFixed(3)),
      financial_score: parseFloat(fScore.toFixed(3)),
      network_score: parseFloat(nScore.toFixed(3)),
      impact_score: parseFloat(Math.min(1.0, mScore).toFixed(3))
    },
    metrics: {
      is_registered: isRegistered,
      completed_milestones: completedMilestones,
      total_milestones: totalMilestones,
      monthly_revenue: mrr,
      reputation_score: repScore,
      female_representation: femalePct,
      youth_representation: youthPct,
      sdgs_aligned: sdgs
    }
  };
}
