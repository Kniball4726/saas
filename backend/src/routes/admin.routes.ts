import { Router } from 'express';
import { reconciliationService } from '../services/reconciliation.service.js';

const router = Router();

// Auditoría y Reconciliación Contable de Libro Mayor
router.get('/reconcile', (req, res) => {
  const auditReport = reconciliationService.runAudit();
  res.json(auditReport);
});

export default router;
