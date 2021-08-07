const removeDiacritics = (text) => {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, "");
}

const getFirstWord = (text) => {
    try {
        if (text.includes(" ")) {
            return text.split(" ")[0]
        } else
            return text;

    } catch (error) {
        console.error(error)
    }
}

module.exports = {
    removeDiacritics,
    getFirstWord
}