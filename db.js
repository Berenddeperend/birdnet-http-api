import Database from 'better-sqlite3';
import { existsSync } from 'fs';
import { execSync } from 'child_process';

function findDb() {
  if (process.env.BIRDNET_DB && existsSync(process.env.BIRDNET_DB)) {
    return process.env.BIRDNET_DB;
  }

  // Auto-detect: find the BirdNET-Pi install user
  const candidates = [
    `/home/${process.env.USER}/BirdNET-Pi/scripts/birds.db`,
    '/home/pi/BirdNET-Pi/scripts/birds.db',
    '/home/birdnet/BirdNET-Pi/scripts/birds.db',
  ];

  // Also try to resolve from the running birdnet service
  try {
    const home = execSync('eval echo ~$(systemctl show -p User birdnet_analysis.service --value)', {
      encoding: 'utf-8',
      timeout: 3000,
    }).trim();
    if (home) candidates.unshift(`${home}/BirdNET-Pi/scripts/birds.db`);
  } catch {}

  for (const path of candidates) {
    if (existsSync(path)) return path;
  }

  throw new Error('birds.db not found. Set BIRDNET_DB env var to the correct path.');
}

let db;

export function getDb() {
  if (!db) {
    const path = findDb();
    db = new Database(path, { readonly: true, fileMustExist: true });
    console.log(`Connected to ${path}`);
  }
  return db;
}

export function todaySpecies() {
  const today = new Date().toISOString().split('T')[0];
  return getDb().prepare(`
    SELECT Com_Name, Sci_Name, COUNT(*) as count,
           ROUND(MAX(Confidence), 2) as max_confidence,
           MIN(Time) as first_seen, MAX(Time) as last_seen
    FROM detections
    WHERE Date = ?
    GROUP BY Com_Name
    ORDER BY count DESC
  `).all(today);
}

export function speciesInRange(from, to) {
  return getDb().prepare(`
    SELECT Com_Name, Sci_Name, COUNT(*) as count,
           ROUND(MAX(Confidence), 2) as max_confidence,
           MIN(Date) as first_date, MAX(Date) as last_date
    FROM detections
    WHERE Date >= ? AND Date <= ?
    GROUP BY Com_Name
    ORDER BY count DESC
  `).all(from, to);
}

export function dailyCounts(from, to) {
  return getDb().prepare(`
    SELECT Date, COUNT(*) as detections, COUNT(DISTINCT Com_Name) as species
    FROM detections
    WHERE Date >= ? AND Date <= ?
    GROUP BY Date
    ORDER BY Date ASC
  `).all(from, to);
}

export function hourlyActivity(from, to) {
  return getDb().prepare(`
    SELECT CAST(SUBSTR(Time, 1, 2) AS INTEGER) as hour,
           COUNT(*) as detections
    FROM detections
    WHERE Date >= ? AND Date <= ?
    GROUP BY hour
    ORDER BY hour ASC
  `).all(from, to);
}

export function recentDetections(limit = 20) {
  return getDb().prepare(`
    SELECT Date, Time, Com_Name, Sci_Name, ROUND(Confidence, 2) as Confidence
    FROM detections
    ORDER BY Date DESC, Time DESC
    LIMIT ?
  `).all(limit);
}

export function weeklyReport() {
  const now = new Date();
  const fmt = (d) => d.toISOString().split('T')[0];

  const weekEnd = now;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);

  const prevEnd = new Date(weekStart);
  prevEnd.setDate(weekStart.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevEnd.getDate() - 6);

  const thisWeek = speciesInRange(fmt(weekStart), fmt(weekEnd));
  const lastWeek = speciesInRange(fmt(prevStart), fmt(prevEnd));
  const daily = dailyCounts(fmt(weekStart), fmt(weekEnd));
  const hourly = hourlyActivity(fmt(weekStart), fmt(weekEnd));

  const lastWeekNames = new Set(lastWeek.map((s) => s.Com_Name));
  const newSpecies = thisWeek.filter((s) => !lastWeekNames.has(s.Com_Name));

  return {
    period: { from: fmt(weekStart), to: fmt(weekEnd) },
    previous_period: { from: fmt(prevStart), to: fmt(prevEnd) },
    summary: {
      total_detections: thisWeek.reduce((sum, s) => sum + s.count, 0),
      unique_species: thisWeek.length,
      prev_total_detections: lastWeek.reduce((sum, s) => sum + s.count, 0),
      prev_unique_species: lastWeek.length,
    },
    new_species: newSpecies,
    species: thisWeek,
    daily,
    hourly,
  };
}
