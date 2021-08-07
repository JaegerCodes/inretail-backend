const {Client} = require('@elastic/elasticsearch');
const client = new Client({
    node: process.env.ELASTIC_SEARCH_URL
});
const fs = require('fs');
require('path');
const productsData = JSON.parse(fs.readFileSync('./assets/elastic-data.json', 'utf8'));
const {
    response
} = require('express');
const colorEnum = require('../utils/ColorEnum');
const findProductsFromCatalog = async (req, res = response) => {

    const {searchWord} = req.query;

    const result = await client.search({
        index: 'catalog',
        body: {
            query: {
                match: {
                    productName: {
                        query: searchWord,
                        fuzziness: "AUTO",
                        analyzer: "spanish_analyzer"
                    }
                }
            }
        }
    })
    let parsedResult = [];
    const searchHits = result.body.hits.hits;
    searchHits.forEach(element => {
        parsedResult.push(element._source);
    });
    res.json(parsedResult);
};

const loadProductsIntoCatalog = async (res = response) => {
    let parsedList = []
    productsData.forEach(element => {
        let minPurchase = Number.MAX_SAFE_INTEGER;
        let presentations = [];
        element.items.forEach(item => {
            const itemPrice = item.sellers[0].commertialOffer.Price;
            if (minPurchase > itemPrice) {
                minPurchase = itemPrice;
            }
            let images = []
            item.images.forEach(image => {
                images.push(image.imageUrl)
            })
            const possibleColor = colorEnum.colors[item.Color[0]];
            presentations.push(
                {
                    "price": itemPrice,
                    "color": possibleColor === undefined ? colorEnum.colors.Plomo : possibleColor,
                    "size": item.Talla[0],
                    "stock": item.sellers[0].AvailableQuantity,
                    "imageUrls": images
                }
            )
        })
        parsedList.push({
            "productId": element.productId,
            "productName": element.productName,
            "minPurchaseAmount": minPurchase,
            "outfitPart": "body",
            "presentations": presentations,
            "outfitItems": [
                {
                    "productId": null,
                    "productName": null,
                    "thumbnailImage": null,
                    "price": null
                }
            ]
        })
    })
    const body = parsedList.flatMap(doc => [{index: {_index: 'catalog'}}, doc])

    const {body: bulkResponse} = await client.bulk({refresh: true, body})

    if (bulkResponse.errors) {
        const erroredDocuments = []
        // The items array has the same order of the dataset we just indexed.
        // The presence of the `error` key indicates that the operation
        // that we did for the document has failed.
        bulkResponse.items.forEach((action, i) => {
            const operation = Object.keys(action)[0]
            if (action[operation].error) {
                erroredDocuments.push({
                    // If the status is 429 it means that you can retry the document,
                    // otherwise it's very likely a mapping error, and you should
                    // fix the document before to try it again.
                    status: action[operation].status,
                    error: action[operation].error,
                    operation: body[i * 2],
                    document: body[i * 2 + 1]
                })
            }
        });
        console.log(erroredDocuments)
    }

    const {body: count} = await client.count({index: 'catalog'})
    console.log(count);

    const okMessage = "Data succesfully loaded";
    res.json({message: okMessage});
}

module.exports = {
    findProductsFromCatalog,
    loadProductsIntoCatalog
}
