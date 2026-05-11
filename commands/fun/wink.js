module.exports = (sock, msg, from, text) => {
    return require("./animeAction")(sock, msg, from, text, "wink");
};