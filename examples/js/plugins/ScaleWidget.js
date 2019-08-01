var ScaleWidget = (function _() {
    var divScaleWidget;

    function updateScaleWidget(view) {
        var value = view.controls.pixelsToMeters(200);
        value = Math.floor(value);
        var digit = Math.pow(10, value.toString().length - 1);
        value = Math.round(value / digit) * digit;
        var pix = view.controls.metersToPixels(value);
        var unit = 'm';
        if (value >= 1000) {
            value /= 1000;
            unit = 'km';
        }
        divScaleWidget.innerHTML = `${value} ${unit}`;
        divScaleWidget.style.width = `${pix}px`;
    }

    return {
        init(div, view) {
            divScaleWidget = document.createElement('div');
            divScaleWidget.id = 'divScaleWidget';
            div.appendChild(divScaleWidget);

            updateScaleWidget(view);

            view.addEventListener(itowns.GLOBE_VIEW_EVENTS.GLOBE_INITIALIZED, function _() {
                updateScaleWidget(view);
            });

            view.controls.addEventListener(itowns.CONTROL_EVENTS.RANGE_CHANGED, function _() {
                updateScaleWidget(view);
            });
        },
    };
}());

if (typeof module != 'undefined' && module.exports) {
    module.exports = ScaleWidget;
}
