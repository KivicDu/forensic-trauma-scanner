import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import injuryCalculator from '../services/injuryCalculator.js';
import physicsEngine from '../services/physicsEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PARSED_DIR = process.env.PARSED_DIR || './parsed';
const SIMULATION_DIR = process.env.SIMULATION_DIR || './simulations';

fs.mkdir(SIMULATION_DIR, { recursive: true }).catch(() => {});

const activeSimulations = new Map();

function scoreToRGB(score) {
  const norm = Math.max(0, Math.min(100, score)) / 100;
  if (norm < 0.3) return [0.1, 0.8, 0.3];
  if (norm < 0.6) return [0.9, 0.7, 0.1];
  return [0.95, 0.15, 0.15];
}

/**
 * START FORENSIC TRAUMA / SCENE ANALYSIS
 * Analyzes physical trauma risks for objects in the scene.
 */
export const startSimulation = async (req, res) => {
  try {
    const { sceneId, duration = 30, ageGroupId = 'adult' } = req.body;

    if (!sceneId) {
      return res.status(400).json({ error: 'sceneId is required' });
    }

    const simulationId = `sim_${Date.now()}`;
    activeSimulations.set(simulationId, {
      status: 'running',
      progress: 0,
      startedAt: new Date().toISOString(),
    });

    res.json({
      success: true,
      simulationId,
      message: 'Forensic trauma analysis started',
    });

    (async () => {
      try {
        const parsedPath = path.join(PARSED_DIR, `${sceneId}.json`);
        let sceneData;
        try {
          sceneData = JSON.parse(await fs.readFile(parsedPath, 'utf8'));
        } catch {
          sceneData = {
            boundingBox: { min: [-5, 0, -5], max: [5, 3, 5] },
            floor: { height: 0 },
            objects: [],
            _scaleFactor: 1.0,
          };
        }

        await physicsEngine.init();

        const objects = sceneData.objects || [];
        const floorHeight = sceneData.floor?.height ?? (sceneData.boundingBox ? sceneData.boundingBox.min[1] : 0);
        const collisionEvents = [];

        // Evaluate physical impact risk for each object in the scene
        objects.forEach((obj, idx) => {
          if (!obj.boundingBox) return;
          const { min, max } = obj.boundingBox;
          const objHeight = max[1] - min[1];
          const objElevation = min[1] - floorHeight;
          const name = (obj.name || `Object_${idx}`).toLowerCase();

          // Skip pure floor and ceiling planes
          if (/floor|ground|ceiling|roof|sky/.test(name) && (max[0] - min[0] > 10 || max[2] - min[2] > 10)) {
            return;
          }

          // Compute surface contact points (corners and center of top/edges)
          const contactPoints = [
            [(min[0] + max[0]) / 2, max[1], (min[2] + max[2]) / 2],
            [min[0], max[1], min[2]],
            [max[0], max[1], min[2]],
            [min[0], max[1], max[2]],
            [max[0], max[1], max[2]],
          ];

          // Determine typical impact scenarios:
          // Fall impact velocity v = sqrt(2 * g * h)
          const fallHeight = Math.max(0.3, objElevation + objHeight);
          const impactSpeed = Math.min(8.0, Math.sqrt(2 * 9.81 * fallHeight));

          // Body parts subject to impact
          const targetPart = fallHeight > 1.0 ? 'head' : (fallHeight > 0.5 ? 'torso' : 'legs');

          contactPoints.forEach((pt, pIdx) => {
            const injuryResult = injuryCalculator.calculateInjury({
              speed: impactSpeed,
              objectType: obj.type || 'furniture',
              objectName: obj.name || 'Hazardous Surface',
              material: obj.material?.type || (name.includes('glass') ? 'glass' : (name.includes('metal') ? 'metal' : 'wood')),
              bodyPart: targetPart,
              ageGroupId: ageGroupId,
              isFallingEvent: objElevation > 0.5,
              impactHeight: pt[1] - floorHeight,
            });

            collisionEvents.push({
              time: pIdx * 0.5,
              agentId: 0,
              objectId: obj.id || `obj_${idx}`,
              objectName: obj.name || `Object_${idx}`,
              position: pt,
              normal: [0, 1, 0],
              velocity: impactSpeed,
              impactSpeed: impactSpeed,
              bodyPart: targetPart,
              agentFeetY: floorHeight,
              injury: injuryResult,
            });
          });
        });

        // Store forensic trauma results
        const simRecord = {
          simulationId,
          sceneId,
          ageGroupId,
          config: {
            duration,
            ageGroupId,
            scaleFactor: sceneData._scaleFactor || 1.0,
            floorHeight,
          },
          collisionEvents,
          totalEvents: collisionEvents.length,
          finishedAt: new Date().toISOString(),
        };

        const outPath = path.join(SIMULATION_DIR, `${simulationId}.json`);
        await fs.writeFile(outPath, JSON.stringify(simRecord, null, 2), 'utf8');

        // Generate forensic audit text report
        const rsi = injuryCalculator.calculateRoomSafetyIndex(collisionEvents);
        const reportContent = [
          '═══════════════════════════════════════════════════',
          '     FORENSIC TRAUMA & SCENE RECONSTRUCTION AUDIT  ',
          '═══════════════════════════════════════════════════',
          `Date:           ${new Date().toISOString()}`,
          `Case / Sim ID:  ${simulationId}`,
          `Scene:          ${sceneId}`,
          `Total Objects:  ${objects.length}`,
          `Total Impact Contacts: ${collisionEvents.length}`,
          '',
          '── TRAUMA RISK INDEX ──',
          `  Score: ${rsi?.score ?? 0}/100  (Grade ${rsi?.grade ?? 'C'})`,
          '',
          '── TOP HAZARDOUS CONTACTS ──',
          ...collisionEvents.slice(0, 10).map((e, i) =>
            `  ${i + 1}. [${e.objectName}] BodyPart: ${e.bodyPart}, Speed: ${e.impactSpeed.toFixed(2)} m/s, G-Force: ${e.injury?.gForce?.toFixed(1) || '0'} G, Risk: ${e.injury?.riskTier || 'safe'}`
          ),
          '═══════════════════════════════════════════════════',
        ].join('\n');

        await fs.writeFile(path.join(SIMULATION_DIR, `${simulationId}_report.txt`), reportContent, 'utf8');

        activeSimulations.set(simulationId, {
          status: 'complete',
          progress: 100,
          totalEvents: collisionEvents.length,
          finishedAt: new Date().toISOString(),
        });

      } catch (err) {
        console.error(`[FORENSIC SIM] Error in ${simulationId}:`, err);
        activeSimulations.set(simulationId, {
          status: 'error',
          error: err.message,
        });
      }
    })();

  } catch (error) {
    console.error('startSimulation error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getSimulationStatus = async (req, res) => {
  const { id } = req.params;
  const sim = activeSimulations.get(id);

  if (sim) {
    return res.json({
      simulationId: id,
      status: sim.status,
      progress: sim.progress ?? 100,
      totalEvents: sim.totalEvents || 0,
      error: sim.error || null,
    });
  }

  // Check on disk
  try {
    const simPath = path.join(SIMULATION_DIR, `${id}.json`);
    const data = JSON.parse(await fs.readFile(simPath, 'utf8'));
    return res.json({
      simulationId: id,
      status: 'complete',
      progress: 100,
      totalEvents: data.collisionEvents?.length || 0,
    });
  } catch {
    return res.status(404).json({ error: 'Simulation not found' });
  }
};

export const getCollisionEvents = async (req, res) => {
  try {
    const { id } = req.params;
    const simPath = path.join(SIMULATION_DIR, `${id}.json`);
    const data = JSON.parse(await fs.readFile(simPath, 'utf8'));
    res.json({
      simulationId: id,
      events: data.collisionEvents || [],
    });
  } catch (error) {
    res.status(404).json({ error: 'Events not found' });
  }
};

export const getSimulationHeatmap = async (req, res) => {
  try {
    const simulationId = req.params.id;
    const simPath = path.join(SIMULATION_DIR, `${simulationId}.json`);
    const simulationData = JSON.parse(await fs.readFile(simPath, 'utf8'));
    const events = simulationData.collisionEvents || [];

    let sceneObjects = {};
    try {
      const parsedPath = path.join(PARSED_DIR, `${simulationData.sceneId}.json`);
      const sceneDataJ = JSON.parse(await fs.readFile(parsedPath, 'utf8'));
      (sceneDataJ.objects || []).forEach(obj => { sceneObjects[obj.id] = obj; });
    } catch (_) {}

    const objectMap = new Map();
    events.forEach(evt => {
      const id = evt.objectId;
      if (!id) return;
      if (!objectMap.has(id)) {
        objectMap.set(id, { objectId: id, objectName: evt.objectName || id, hits: [], collisions: [] });
      }
      const entry = objectMap.get(id);
      entry.hits.push(evt.injury || {});
      if (evt.position) {
        entry.collisions.push({
          position: evt.position,
          normal: evt.normal || [0, 1, 0],
          score: evt.injury?.injuryScore ?? 0,
          gForceTier: evt.injury?.gForceTier ?? 'Observe',
          riskTier: evt.injury?.riskTier ?? 'safe',
        });
      }
    });

    const objectHeatmap = [];
    for (const [objId, entry] of objectMap) {
      const scores = entry.hits.map(h => h.injuryScore || 0);
      const gForces = entry.hits.map(h => h.gForce || 0);
      const maxScore = Math.max(...scores, 0);
      const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      const maxGForce = Math.max(...gForces, 0);
      const avgGForce = gForces.length > 0 ? Math.round(gForces.reduce((a, b) => a + b, 0) / gForces.length * 10) / 10 : 0;
      const worstGForceTier = maxGForce >= 50 ? 'Serious Injury' : maxGForce >= 20 ? 'Soft Injury' : 'Observe';

      const bodyParts = {};
      entry.hits.forEach(h => { if (h.bodyPart) bodyParts[h.bodyPart] = (bodyParts[h.bodyPart] || 0) + 1; });
      const primaryBodyPart = Object.entries(bodyParts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';

      const specificInjuries = entry.hits.filter(h => h.specificInjury).map(h => h.specificInjury);
      const hicValues = entry.hits.map(h => h.hic15 || 0);
      const forceValues = entry.hits.map(h => h.impactForceN || 0);

      const sceneObj = sceneObjects[objId];
      const boundingBox = sceneObj?.boundingBox || null;

      objectHeatmap.push({
        objectId: objId,
        objectName: entry.objectName,
        boundingBox,
        totalHits: entry.hits.length,
        collisions: entry.collisions,
        collisionPositions: entry.collisions.map(c => c.position),
        maxInjuryScore: maxScore,
        avgInjuryScore: avgScore,
        maxGForce,
        avgGForce,
        worstGForceTier,
        primaryBodyPart,
        heatColor: scoreToRGB(maxScore),
        intensity: Math.max(0, Math.min(1.0, maxScore / 80)),
        recommendations: [],
        fractureCount: specificInjuries.length,
        specificInjuries: [...new Set(specificInjuries)],
        maxHIC: Math.round(Math.max(...hicValues, 0) * 100) / 100,
        maxImpactForceN: Math.round(Math.max(...forceValues, 0)),
        bodyPartDistribution: bodyParts,
      });
    }

    objectHeatmap.sort((a, b) => b.maxInjuryScore - a.maxInjuryScore);
    const rsi = injuryCalculator.calculateRoomSafetyIndex(events);

    res.json({
      success: true,
      simulationId,
      heatmap: objectHeatmap,
      roomSafetyIndex: rsi,
      stats: {
        totalEvents: events.length,
        uniqueObjectsHit: objectMap.size,
        duration: simulationData.config?.duration || 10,
      },
      pointHeatmap: events.map(evt => ({
        position: evt.position,
        intensity: (evt.injury?.injuryScore || 0) / 100,
        injuryScore: evt.injury?.injuryScore || 0,
        gForce: evt.injury?.gForce || 0,
        riskTier: evt.injury?.riskTier || 'safe',
        gForceTier: evt.injury?.gForceTier || 'Observe',
        objectName: evt.objectName,
      })),
    });

  } catch (error) {
    console.error('Heatmap error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getSimulationReport = async (req, res) => {
  try {
    const simulationId = req.params.id;
    const reportPath = path.join(SIMULATION_DIR, `${simulationId}_report.txt`);
    const reportContent = await fs.readFile(reportPath, 'utf8');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="forensic_report_${simulationId}.txt"`);
    res.send(reportContent);
  } catch (error) {
    res.status(404).json({ success: false, error: 'Report not found' });
  }
};