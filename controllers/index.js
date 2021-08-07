const healthyCheck = async (req, res = response) => {
    let healthyMessage = {status: "Service is healthy"};
    res.status(200).json(healthyMessage);
}

module.exports = {
    healthyCheck
}
