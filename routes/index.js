const { Router } = require('express');

const router = Router();

const { healthyCheck } = require('../controllers');

/**
 * {{url}}/health
 */

// Get health check

router.get('/', healthyCheck );

module.exports = router;