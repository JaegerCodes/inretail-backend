const {Client} = require('@elastic/elasticsearch');
const client = new Client({
    node: process.env.ELASTIC_SEARCH_URL
});
const fs = require('fs');
require('path');
JSON.parse(fs.readFileSync('./assets/elastic-data.json', 'utf8'));
const {
    response
} = require('express');
require('../utils/ColorEnum');

const parseResult = (result) => {
    let parsedResult = [];
    const searchHits = result.body.hits.hits;
    searchHits.forEach(element => {
        parsedResult.push(element._source);
    });
    return parsedResult;
}

const parseSuggestionWords = (result) => {
    let parsedResult = [];
    const similarWords = result.body.suggest.spanish_suggester;
    similarWords.forEach(element => {
        parsedResult.push(element.options);
    });
    return parsedResult;
}

const suggestProductByName = async (req, res = response) => {
    const {searchWord} = req.query;

    const result = await client.search({
        index: 'catalog',
        body: {
            suggest: {
                spanish_suggester: {
                    text: searchWord,
                    term: {
                        analyzer: "spanish_analyzer",
                        field: "productName"
                    }
                }
            }
        }
    })

    let parsedResult = parseSuggestionWords(result);
    res.json(parsedResult);
};

const findProductsFromCatalog = async (req, res = response) => {

    const {searchWord} = req.query;

    const result = await client.search({
        index: 'catalog',
        body: {
            from: 0,
            size: 50,
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
    let parsedResult = parseResult(result);
    res.json(parsedResult);
};

const dashboardProducts = async (req, res = response) => {
    const result = await client.search({
        index: 'catalog',
        body: {
            from: 0,
            size: 20,
            query: {
                match_all: {}
            }
        }
    });
    let parsedResult = parseResult(result);
    res.json(parsedResult);
}

const findProductById = async (req, res = response) => {
    const params = req.params;
    const productId = params.productId;

    const result = await client.search({
        index: 'catalog',
        body: {
            from: 0,
            size: 10,
            query: {
                match: {
                    productId: {
                        query: productId
                    }
                }
            }
        }
    })
    let parsedResult = parseResult(result);
    res.json(parsedResult);
};

module.exports = {
    findProductsFromCatalog,
    dashboardProducts,
    suggestProductByName,
    findProductById
}
