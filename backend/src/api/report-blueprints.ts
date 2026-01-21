import { Request, Response } from 'express';
import { getBlueprintVersion, listReportBlueprints } from '../services/report-blueprints.js';

export function getReportBlueprints(req: Request, res: Response) {
  if (!req.auth) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    return res.json({
      version: getBlueprintVersion(),
      results: listReportBlueprints()
    });
  } catch (error) {
    console.error('Failed to list report blueprints:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
