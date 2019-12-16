import express from 'express';
import { Metric } from '../models/metric';
import { check, validationResult } from 'express-validator';
import { auth } from '../middleware/auth';

const router = new express.Router();

// GET /metric/ID??key=&component=&result=&group=&dateBefore=&dateAfter=
// GET /metric/ID?sortBy=-date;key;component;result
// GET /metric/ID?limit=10&skip=20
// GET /metric/ID
router.get('/metric/:id', [check('id').isMongoId()], auth, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
    }

    const args = {}

    if (req.query.key) { args.key = req.query.key }
    if (req.query.group) { args.group = req.query.group }
    if (req.query.component) { args.component = req.query.component }
    if (req.query.result) { args.result = req.query.result }
    if (req.query.dateBefore && !req.query.dateAfter) { 
        args.date = { $lte: new Date(req.query.dateBefore) } 
    }
    if (req.query.dateAfter && !req.query.dateBefore) { 
        args.date = { $gte: new Date(req.query.dateAfter) } 
    }
    if (req.query.dateAfter && req.query.dateBefore) { 
        args.date = { $gte: new Date(req.query.dateAfter), $lte: new Date(req.query.dateBefore) } 
    }

    try {
        const metrics = await Metric.find({ domain: req.params.id, ...args }, 
            'key component entry result reason group date -_id', {
                skip: parseInt(req.query.skip),
                limit: parseInt(req.query.limit),
            }).sort(req.query.sortBy ? req.query.sortBy.replace(';', ' ') : 'date');

        if (!metrics) {
            return res.status(404).send();
        }

        res.send(metrics)
    } catch (e) {
        res.status(404).send();
    }
})

export default router;