/**
 * Attendance calculation service
 * Provides accurate academic attendance math, safe bunk calculation, and targets
 */

/**
 * Calculate attendance metrics for given attended and total classes
 * @param {number} attended - Classes attended
 * @param {number} total - Total classes held
 * @param {number} target - Target percentage (e.g., 75)
 * @returns {object} Calculated metrics
 */
const calculateMetrics = (attended, total, target = 75) => {
  const safeAttended = Math.max(0, Number(attended) || 0);
  const safeTotal = Math.max(safeAttended, Number(total) || 0);
  const safeTarget = Math.min(100, Math.max(0, Number(target) || 75));

  const percentage = safeTotal > 0 ? Number(((safeAttended / safeTotal) * 100).toFixed(2)) : 0;

  let classesNeeded = 0;
  let bunksAvailable = 0;

  if (safeTarget >= 100) {
    classesNeeded = safeAttended === safeTotal ? 0 : -1; // -1 denotes impossible to achieve 100% once missed
    bunksAvailable = 0;
  } else if (percentage < safeTarget) {
    // Formula: (attended + X) / (total + X) >= target / 100
    // 100 * attended + 100X >= target * total + target * X
    // X * (100 - target) >= target * total - 100 * attended
    // X = ceil((target * total - 100 * attended) / (100 - target))
    const numerator = safeTarget * safeTotal - 100 * safeAttended;
    const denominator = 100 - safeTarget;
    classesNeeded = Math.ceil(numerator / denominator);
    bunksAvailable = 0;
  } else {
    // Current >= target
    classesNeeded = 0;
    // Formula: attended / (total + Y) >= target / 100
    // 100 * attended >= target * total + target * Y
    // Y * target <= 100 * attended - target * total
    // Y = floor((100 * attended - target * total) / target)
    if (safeTarget > 0) {
      const numerator = 100 * safeAttended - safeTarget * safeTotal;
      bunksAvailable = Math.floor(numerator / safeTarget);
    } else {
      bunksAvailable = 999;
    }
  }

  let status = 'neutral';
  if (safeTotal > 0) {
    if (percentage >= safeTarget) {
      status = 'safe';
    } else if (percentage >= safeTarget - 10) {
      status = 'warning';
    } else {
      status = 'critical';
    }
  }

  return {
    attendedClasses: safeAttended,
    totalClasses: safeTotal,
    targetPercentage: safeTarget,
    percentage,
    classesNeeded: Math.max(0, classesNeeded),
    isTargetImpossible: classesNeeded === -1,
    bunksAvailable: Math.max(0, bunksAvailable),
    status,
    needsAttention: status === 'warning' || status === 'critical',
  };
};

module.exports = {
  calculateMetrics,
};
