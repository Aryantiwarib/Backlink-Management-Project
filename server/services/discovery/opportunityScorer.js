/**
 * Opportunity Scoring Engine for Link Prospects
 *
 * Calculates a transparent, explainable score (0 - 100) based on objective SEO metrics
 * and discovery signals to help users prioritize outreach opportunities.
 */
export function calculateOpportunityScore({
  domainAuthority = null,
  spamScore = null,
  competitorOverlap = 1,
  source = 'competitor',
  linkType = 'unknown'
} = {}) {
  const factors = [];
  let score = 0;

  // 1. Domain Authority Component (Max 40 points)
  if (typeof domainAuthority === 'number' && !isNaN(domainAuthority)) {
    if (domainAuthority >= 75) {
      score += 40;
      factors.push({
        factor: 'High Domain Authority',
        points: 40,
        description: `Exceptional link equity potential (DA ${domainAuthority})`
      });
    } else if (domainAuthority >= 50) {
      score += 30;
      factors.push({
        factor: 'Strong Domain Authority',
        points: 30,
        description: `High authority web property (DA ${domainAuthority})`
      });
    } else if (domainAuthority >= 30) {
      score += 20;
      factors.push({
        factor: 'Moderate Authority',
        points: 20,
        description: `Solid niche authority (DA ${domainAuthority})`
      });
    } else if (domainAuthority >= 15) {
      score += 10;
      factors.push({
        factor: 'Emerging Authority',
        points: 10,
        description: `Growing or niche domain (DA ${domainAuthority})`
      });
    } else {
      score += 5;
      factors.push({
        factor: 'Early Stage Domain',
        points: 5,
        description: `Low authority profile (DA ${domainAuthority})`
      });
    }
  } else {
    // Missing metrics must not be treated as zero: provide fair neutral baseline authority (15 pts)
    score += 15;
    factors.push({
      factor: 'DA Unassessed',
      points: 15,
      description: 'Domain authority metric unassessed from provider; evaluated with neutral baseline authority'
    });
  }

  // 2. Spam Score Component (Max 20 points / Penalty)
  if (typeof spamScore === 'number' && !isNaN(spamScore)) {
    if (spamScore < 5) {
      score += 20;
      factors.push({
        factor: 'Pristine Spam Profile',
        points: 20,
        description: `Very low spam likelihood (${spamScore}%)`
      });
    } else if (spamScore < 15) {
      score += 12;
      factors.push({
        factor: 'Acceptable Risk',
        points: 12,
        description: `Low spam score indicator (${spamScore}%)`
      });
    } else if (spamScore < 30) {
      score += 0;
      factors.push({
        factor: 'Moderate Risk',
        points: 0,
        description: `Spam score warrants evaluation (${spamScore}%)`
      });
    } else {
      score -= 20;
      factors.push({
        factor: 'High Spam Risk Penalty',
        points: -20,
        description: `Elevated spam score flags caution (${spamScore}%)`
      });
    }
  } else {
    score += 10;
    factors.push({
      factor: 'Neutral Spam Profile',
      points: 10,
      description: 'Spam score unassessed; evaluated neutrally'
    });
  }

  // 3. Competitor Overlap & Proven Linking Willingness (Max 25 points)
  if (source === 'competitor') {
    if (competitorOverlap >= 2) {
      score += 25;
      factors.push({
        factor: 'Multi-Competitor Overlap',
        points: 25,
        description: `Links to ${competitorOverlap} competitors — highly proven link-giver in your niche`
      });
    } else {
      score += 18;
      factors.push({
        factor: 'Competitor Linker',
        points: 18,
        description: 'Links to your competitor — validated linking candidate'
      });
    }
  } else if (source === 'keyword') {
    score += 15;
    factors.push({
      factor: 'Niche Keyword Match',
      points: 15,
      description: 'Topical alignment discovered via target niche keyword search'
    });
  } else {
    score += 10;
    factors.push({
      factor: 'Direct Opportunity',
      points: 10,
      description: 'Manually identified or directory opportunity candidate'
    });
  }

  // 4. Link Follow Quality (Max 15 points)
  const normLinkType = (linkType || '').toLowerCase();
  if (normLinkType === 'dofollow') {
    score += 15;
    factors.push({
      factor: 'Dofollow Value',
      points: 15,
      description: 'Transfers PageRank authority to competitor target'
    });
  } else if (normLinkType === 'nofollow') {
    score += 5;
    factors.push({
      factor: 'Nofollow Attribute',
      points: 5,
      description: 'Nofollow link observed; potential referral traffic value'
    });
  } else {
    score += 8;
    factors.push({
      factor: 'Standard Placement',
      points: 8,
      description: 'Standard editorial link placement candidate'
    });
  }

  // Clamp final score strictly between 0 and 100
  const finalScore = Math.max(0, Math.min(100, Math.round(score)));

  return {
    score: finalScore,
    factors
  };
}

export default calculateOpportunityScore;
