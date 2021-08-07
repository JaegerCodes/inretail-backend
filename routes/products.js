const {Router} = require('express');

const {
    getProducts,
    loadProducts
} = require('../controllers/products');

const {
    findProductsFromCatalog,
    dashboardProducts,
    findProductById,
    suggestProductByName
} = require('../api-controllers/products');

const router = Router();


router.get('/', getProducts);
router.get('/load', loadProducts);

router.get('/catalog', findProductsFromCatalog);
router.get('/suggest', suggestProductByName);
router.get('/:productId', findProductById);
router.get('/dashboard', dashboardProducts);

module.exports = router;
