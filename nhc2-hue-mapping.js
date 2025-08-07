module.exports = function(RED) {
    function Nhc2HueMappingNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        var mode = config.mode || 'brightness';

        // Helper: convert HSV to RGB
        function hsvToRgb(h, s, v) {
            var c = v * s;
            var x = c * (1 - Math.abs((h / 60) % 2 - 1));
            var m = v - c;
            var rp, gp, bp;
            if (h < 60) { rp = c; gp = x; bp = 0; }
            else if (h < 120) { rp = x; gp = c; bp = 0; }
            else if (h < 180) { rp = 0; gp = c; bp = x; }
            else if (h < 240) { rp = 0; gp = x; bp = c; }
            else if (h < 300) { rp = x; gp = 0; bp = c; }
            else { rp = c; gp = 0; bp = x; }
            return [
                Math.round((rp + m) * 255),
                Math.round((gp + m) * 255),
                Math.round((bp + m) * 255)
            ];
        }

        node.on('input', function(msg) {
            var val = msg.payload;
            var out = {};

            // Normalize strings
            if (typeof val === 'string') {
                var sVal = val.trim().toLowerCase();
                if (sVal === 'on') {
                    msg.payload = { on: true };
                    node.send(msg);
                    return;
                }
                if (sVal === 'off') {
                    msg.payload = { on: false };
                    node.send(msg);
                    return;
                }
                var n = Number(sVal);
                if (!isNaN(n)) { val = n; }
            }

            // Boolean
            if (typeof val === 'boolean') {
                msg.payload = { on: val };
                node.send(msg);
                return;
            }

            // Number
            if (typeof val === 'number') {
                if (mode === 'brightness') {
                    if (val > 0) { out.brightness = val; out.on = true; }
                    else { out.brightness = val; }
                } else if (mode === 'colorTemp') {
                    var temp = Math.round(153 + (val / 100) * (500 - 153));
                    out.colorTemp = temp;
                    if (val > 0) out.on = true;
                } else if (mode === 'color') {
                    // Map 0-100 to hue 0-360 and full saturation/value
                    var hue = (val / 100) * 360;
                    var rgb = hsvToRgb(hue, 1, 1);
                    out.rgb = rgb;
                    if (val > 0) out.on = true;
                }
                msg.payload = out;
                node.send(msg);
                return;
            }

            node.warn("Unsupported payload for mode '" + mode + "': " + JSON.stringify(msg.payload));
        });
    }
    RED.nodes.registerType('nhc2-hue-mapping', Nhc2HueMappingNode);
};
