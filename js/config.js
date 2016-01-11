// synchronizedly get variables from config.json
var config = (function () {
    var config = null;
    $.ajax({
        'async': false,
        'global': false,
        'url': 'config/config.json',
        'dataType': "json",
        'success': function (data) {
            config = data;
        }
    });
    return config;
})(); 