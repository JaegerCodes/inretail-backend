const { Router } = require('express');
let axios = require('axios').default;

const {
    getProducts
} = require('../controllers/products');

const router = Router();


router.get('/', getProducts);

module.exports = router;