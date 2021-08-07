const { Router } = require('express');
let axios = require('axios').default;

const {
    getProducts,
    loadProducts
} = require('../controllers/products');

const router = Router();


router.get('/', getProducts);
router.get('/load', loadProducts);

module.exports = router;