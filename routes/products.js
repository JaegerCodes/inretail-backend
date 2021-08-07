const { Router } = require('express');
let axios = require('axios').default;

const {
    getProducts,
    loadProducts
} = require('../controllers/products');

const {
    findProductsFromCatalog,
    dashboardProducts
} = require('../api-controllers/products');

const router = Router();


router.get('/', getProducts);
router.get('/load', loadProducts);

router.get('/catalog', findProductsFromCatalog);
router.get('/dashboard', dashboardProducts);

module.exports = router;