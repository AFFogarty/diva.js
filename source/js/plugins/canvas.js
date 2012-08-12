/*

Canvas plugin for diva.js
Adds a little "tools" icon next to each image

*/

(function ($) {
    window.divaPlugins.push((function () {
        var canvas = {},
            map = {},
            settings = {},
            image,
            sliders;

        // Set up some default settings (can be overridden the normal way)
        var defaults = {
            brightnessMax: 150,
            brightnessMin: -100,
            brightnessStep: 1,
            contrastMax: 3,
            contrastMin: -1,
            contrastStep: 0.05,
            rgbMax: 100,
            rgbMin: -100
        };

        // Convert an angle from degrees to radians
        var toRadians = function (angle) {
            return angle * Math.PI / 180;
        };

        // Determine the new center of the page after rotating by the given angle
        var getNewCenter = function (currentCenter, angle) {
            var x = currentCenter.x - canvas.centerX;
            // Take the negative because the rotation is counterclockwise
            var y = -(currentCenter.y - canvas.centerY);

            var theta = toRadians(sliders.rotation.previous - angle);
            var x = Math.cos(theta) * x - Math.sin(theta) * y + canvas.centerX;
            var y = -(Math.sin(theta) * x + Math.cos(theta) * y) + canvas.centerY;

            return {'x': x, 'y': y};
        };

        // Rotates the image on the given canvas by the given angle
        var rotateCanvas = function (aCanvas, angle) {
            var context = aCanvas.context;
            var center = aCanvas.size / 2;

            // Clear the canvas so that remnants of the old image don't show
            context.clearRect(0, 0, aCanvas.size, aCanvas.size);

            // Do the rotation
            context.save();
            context.translate(center, center);
            context.rotate(toRadians(angle));
            context.drawImage(image, -(aCanvas.width/2), -(aCanvas.height/2), aCanvas.width, aCanvas.height);
            context.restore();

            // Save the new pixel data so that it can later be adjusted in adjustLevels
            aCanvas.data = context.getImageData(0, 0, aCanvas.size, aCanvas.size);
        };

        // Determine if we need to update the large canvas
        var shouldAdjustLevels = function () {
            // Returns true if something has been changed
            for (slider in sliders) {
                if (sliders[slider].current !== sliders[slider].previous) {
                    return true;
                }
            }

            return false;
        };

        // Sets the "previous" value to the "current" value for every slider
        var updatePreviousLevels = function () {
            for (slider in sliders) {
                sliders[slider].previous = sliders[slider].current;
            }
        };

        // Update the large canvas (rotation, zooming, scrolling, pixel manipulation)
        var updateCanvas = function () {
            var angle = sliders.rotation.current;
            var oldAngle = sliders.rotation.previous;
            var zoomLevel = sliders.zoom.current;
            var oldZoomLevel = sliders.zoom.previous;

            // Scroll the user to the desired location
            if (angle !== oldAngle || zoomLevel !== oldZoomLevel) {
                // First figure out the current center of the viewport
                var leftScroll = $('#diva-canvas-wrapper').scrollLeft();
                var topScroll = $('#diva-canvas-wrapper').scrollTop();
                var leftOffset = settings.viewport.width / 2;
                var topOffset = settings.viewport.height / 2;

                // Then determine the new center (the same part of the image)
                var newCenter = getNewCenter({x: leftScroll + leftOffset, y: topScroll + topOffset}, angle);

                // Incorporate the zoom change ratio (would be 1 if no change)
                var zoomChange = Math.pow(2, zoomLevel - oldZoomLevel);
                var toLeftScroll = zoomChange * newCenter.x - leftOffset;
                var toTopScroll = zoomChange * newCenter.y - topOffset;

                // Rotate the large canvas
                rotateCanvas(canvas, angle);

                // Scroll to the new center
                $('#diva-canvas-wrapper').scrollLeft(toLeftScroll);
                $('#diva-canvas-wrapper').scrollTop(toTopScroll);
            }

            // Only call adjustLevels again if we really need to (expensive)
            if (shouldAdjustLevels()) {
                adjustLevels(canvas);
                updatePreviousLevels();
            }
        };

        // Copies the canvas' pixel array and returns the copy
        var copyImageData = function (aCanvas) {
            var oldImageData = aCanvas.data;
            var newImageData = aCanvas.context.createImageData(oldImageData);
            var pixelArray = newImageData.data;

            for (var i = 0, length = pixelArray.length; i < length; i++) {
                pixelArray[i] = oldImageData.data[i];
            }

            return newImageData;
        };

        // Determines whether or not we need to adjust this level - very simple
        var shouldAdjust = function (mode) {
            var thisChanged = sliders[mode].current !== sliders[mode].previous;
            var thisNotDefault = sliders[mode].current !== sliders[mode].initial;

            return thisChanged || thisNotDefault;
        };

        var adjustLevels = function (aCanvas) {
            // Copy the pixel array to avoid destructively modifying the original
            var imageData = copyImageData(aCanvas);
            var pixelArray = imageData.data;

            // Store and calculate some scale factors and offsets
            var brightness = sliders.brightness.current;
            var contrast = sliders.contrast.current;

            var brightMul = 1 + Math.min(settings.brightnessMax, Math.max(settings.brightnessMin, brightness)) / settings.brightnessMax;
            var brightTimesContrast = brightMul * contrast;
            var contrastOffset = 128 - (contrast * 128);

            var redOffset = sliders.red.current;
            var greenOffset = sliders.green.current;
            var blueOffset = sliders.blue.current;

            // Determine whether or not we need to adjust certain things
            var adjustRed = shouldAdjust('red');
            var adjustGreen = shouldAdjust('green');
            var adjustBlue = shouldAdjust('blue');

            var adjustBrightness = shouldAdjust('brightness');
            var adjustContrast = shouldAdjust('contrast');
            var adjustOthers = adjustBrightness || adjustContrast;

            var x, y, width, height, offset, r, g, b;

            for (x = 0, width = imageData.width; x < width; x++) {
                for (y = 0, height = imageData.height; y < height; y++) {
                    offset = (y * width + x) * 4;

                    r = pixelArray[offset];
                    g = pixelArray[offset + 1];
                    b = pixelArray[offset + 2];

                    // Only do something if the pixel is not black originally
                    if (r + g + b > 0) {
                        // Only adjust individual colour channels if necessary
                        if (adjustRed && r) {
                            r += redOffset;
                        }

                        if (adjustGreen && g) {
                            g += greenOffset;
                        }

                        if (adjustBlue && b) {
                            b += blueOffset;
                        }

                        // If we need to adjust brightness and/or contrast
                        if (adjustOthers) {
                            if (r) {
                                r = r * brightTimesContrast + contrastOffset;
                            }

                            if (g) {
                                g = g * brightTimesContrast + contrastOffset;
                            }

                            if (b) {
                                b = b * brightTimesContrast + contrastOffset;
                            }
                        }

                        pixelArray[offset] = r;
                        pixelArray[offset + 1] = g;
                        pixelArray[offset + 2] = b;
                    }
                }
            }

            aCanvas.context.clearRect(0, 0, width, height);
            aCanvas.context.putImageData(imageData, 0, 0);
        };

        // Update the box in the preview showing where you currently are
        var updateViewbox = function () {
            // Determine the top left corner coordinates based on our current position
            var cornerX = $('#diva-canvas-wrapper').scrollLeft() * map.scaleFactor + 10;
            var cornerY = $('#diva-canvas-wrapper').scrollTop() * map.scaleFactor + 10;

            // Subtract 4 to compensate for the borders
            var height = Math.min(Math.round(settings.viewport.height * map.scaleFactor), settings.mapSize) - 4;
            var width = Math.min(Math.round(settings.viewport.width * map.scaleFactor), settings.mapSize) - 4;

            $('#diva-map-viewbox').height(height).width(width).css({top: cornerY, left: cornerX});
        };

        // Draw the thumbnail preview in the toolbar
        var loadMap = function (image) {
            map.canvas = document.getElementById('diva-canvas-minimap');
            map.size = settings.mapSize;
            map.canvas.width = map.size;
            map.canvas.height = map.size;

            // Give it a black background
            map.context = map.canvas.getContext('2d');
            map.context.fillRect(0, 0, map.size, map.size);

            // Determine the coordinates/dimensions of the preview
            map.scaleFactor = settings.mapSize / canvas.size;
            map.cornerX = canvas.cornerX * map.scaleFactor;
            map.cornerY = canvas.cornerY * map.scaleFactor;
            map.width = image.width * map.scaleFactor;
            map.height = image.height * map.scaleFactor;

            // Draw the image within the map (no adjustments) and save the pixel array
            map.context.drawImage(image, map.cornerX, map.cornerY, map.width, map.height);
            map.data = map.context.getImageData(0, 0, settings.mapSize, settings.mapSize);

            // Make the viewbox reflect where we currently are
            updateViewbox();
        };

        // Load the image within the large and small canvases
        var loadCanvas = function (imageURL, callback) {
            image = new Image();
            image.src = imageURL;

            image.onload = function () {
                // Determine the size of the (square) canvas based on the hypoteneuse
                canvas.size = Math.sqrt(image.width * image.width + image.height * image.height);

                // Resize the canvas if necessary
                canvas.canvas = document.getElementById('diva-canvas');
                canvas.canvas.width = canvas.size;
                canvas.canvas.height = canvas.size;
                canvas.cornerX = (canvas.size - image.width) / 2;
                canvas.cornerY = (canvas.size - image.height) / 2;
                canvas.width = image.width;
                canvas.height = image.height;
                canvas.centerX = canvas.size / 2;
                canvas.centerY = canvas.size / 2;

                // Draw the image to the large canvas, and save the pixel array
                canvas.context = canvas.canvas.getContext('2d');
                canvas.context.drawImage(image, canvas.cornerX, canvas.cornerY, canvas.width, canvas.height);
                canvas.data = canvas.context.getImageData(0, 0, canvas.size, canvas.size);

                // Only load the map the first time (when there is no callback)
                if (callback === undefined) {
                    loadMap(image);
                }

                // If the callback function exists, execute it (for zooming)
                if (typeof(callback) == 'function') {
                    callback.call(callback);
                }
            };
        };

        // Returns the URL for the image at the specified zoom level
        var getImageURL = function (zoomLevel) {
            var width = settings.zoomWidthRatio * Math.pow(2, zoomLevel);

            if (settings.canvasProxyURL) {
                return settings.canvasProxyURL + "?f=" + settings.filename + "&w=" + width;
            } else {
                return settings.iipServerURL + settings.filename + '&WID=' + width + '&CVT=JPG';
            }
        };

        // Hides the loading indicator icon
        var hideThrobber = function () {
            $('#diva-canvas-loading').fadeOut('slow');
        };

        // Handles zooming in when the zoom slider is changed and the change is applied
        var updateZoom = function (newZoomLevel, callback) {
            settings.zoomLevel = newZoomLevel;

            // Figure out the URL for the image at this new zoom level
            var imageURL = getImageURL(newZoomLevel);

            loadCanvas(imageURL, function () {
                updateCanvas();

                // Set the new scale factor and update the viewbox
                map.scaleFactor = map.size / canvas.size;
                updateViewbox();

                hideThrobber();
            });
        };

        return {
            init: function (divaSettings) {
                // Save some settings
                settings = $.extend(settings, defaults, divaSettings);
                settings.viewport = {
                    height: window.innerHeight - settings.scrollbarWidth,
                    width: window.innerWidth - settings.scrollbarWidth
                };
                settings.inCanvas = false;

                // Set up the settings for the sliders/icons
                sliders = {
                    'contrast': {
                        'initial': 1,
                        'min': settings.contrastMin,
                        'max': settings.contrastMax,
                        'step': settings.contrastStep,
                        'transform': function (value) {
                            return value.toFixed(2);
                        },
                        'title': 'Change the contrast'
                    },
                    'brightness': {
                        'initial': 0,
                        'min': settings.brightnessMin,
                        'max': settings.brightnessMax,
                        'step': settings.brightnessStep,
                        'title': 'Adjust the brightness'
                    },
                    'rotation': {
                        'initial': 0,
                        'min': 0,
                        'max': 359,
                        'step': 1,
                        'transform': function (value) {
                            return value + '&deg;';
                        },
                        'title': 'Rotate the image'
                    },
                    'zoom': {
                        // Default, min and max values updated within setupHook
                        'initial': 0,
                        'min': 0,
                        'max': 0,
                        'step': 1,
                        'title': 'Adjust the zoom level'
                    },
                    'red': {
                        'initial': 0,
                        'min': settings.rgbMin,
                        'max': settings.rgbMax,
                        'step': 1,
                        'title': 'Adjust the red channel'
                    },
                    'green': {
                        'initial': 0,
                        'min': settings.rgbMin,
                        'max': settings.rgbMax,
                        'step': 1,
                        'title': 'Adjust the green channel'
                    },
                    'blue': {
                        'initial': 0,
                        'min': settings.rgbMin,
                        'max': settings.rgbMax,
                        'step': 1,
                        'title': 'Adjust the blue channel'
                    }
                };

                // Copy the "default" value into "value" and "previous" for each slider
                var resetSliders = function () {
                    var defaultValue, thisSlider;
                    for (slider in sliders) {
                        thisSlider = sliders[slider];
                        defaultValue = thisSlider.initial;
                        thisSlider.current = defaultValue;
                        thisSlider.previous = defaultValue;
                    }
                };

                resetSliders();

                // Create the DOM elements
                var buttons = [
                    'contrast',
                    'brightness',
                    'rotation',
                    'zoom',
                    'red',
                    'green',
                    'blue'
                ];

                var canvasButtonsList = [], buttonHTML, button, buttonTitle;
                for (i in buttons) {
                    button = buttons[i];
                    buttonTitle = sliders[button].title;
                    buttonHTML = '<div class="' + button + '" title="' + buttonTitle + '"></div>';
                    canvasButtonsList.push(buttonHTML);
                }
                var canvasButtons = canvasButtonsList.join('');

                var canvasTools = '<div id="diva-canvas-tools">' +
                    '<div id="diva-map-viewbox"></div>' +
                    '<canvas id="diva-canvas-minimap"></canvas>' +
                    '<div id="diva-canvas-buttons">' +
                        canvasButtons +
                    '</div>' +
                    '<div id="diva-canvas-pane">' +
                        '<p id="diva-canvas-tooltip">' +
                            '<span id="diva-canvas-mode">contrast</span>: ' +
                            '<span id="diva-canvas-value">0</span> ' +
                            '<span id="diva-canvas-reset" class="link">(Reset)</span>' +
                        '</p>' +
                        '<div id="diva-canvas-slider"></div>' +
                    '</div>' +
                    '<br />' +
                    '<div class="action-buttons">' +
                        '<a href="#" id="diva-canvas-reset-all">Reset all</a>' +
                        '<a href="#" id="diva-canvas-apply">Apply</a>' +
                    '</div>' +
                '</div>';
                var canvasWrapper = '<div id="diva-canvas-wrapper">' +
                    '<canvas id="diva-canvas"></canvas>' +
                '</div>';
                var canvasActions = '<div id="diva-canvas-actions">' +
                    '<div id="diva-canvas-close" title="Return to the document viewer"></div>' +
                    '<div id="diva-canvas-minimise" title="Minimise the toolbar"></div>' +
                '</div>';
                var canvasLoading = '<div id="diva-canvas-loading">' +
                '</div>';
                var canvasString = '<div id="diva-canvas-backdrop">' +
                    canvasTools +
                    canvasWrapper +
                    canvasActions +
                    canvasLoading +
                '</div>';

                $('body').append(canvasString);

                // Save the size of the map, as defined in the CSS
                settings.mapSize = $('#diva-canvas-minimap').width();

                // Adjust the slider when something is clicked, and make that the current mode
                var sliderMode;
                $('#diva-canvas-buttons div').click(function () {
                    $('#diva-canvas-buttons .clicked').removeClass('clicked');
                    updateSlider($(this).attr('class'));
                });

                var updateSlider = function (newMode) {
                    sliderMode = newMode;
                    var sliderData = sliders[sliderMode];

                    $('#diva-canvas-buttons .' + sliderMode).addClass('clicked');

                    $('#diva-canvas-mode').text(sliderMode);

                    var newValue = sliderData.current;
                    var newValueString = (sliderData.transform) ? sliderData.transform(newValue) : newValue;

                    $('#diva-canvas-slider').slider({
                        'min': sliderData.min,
                        'max': sliderData.max,
                        'step': sliderData.step
                    }).slider('value', newValue);
                    $('#diva-canvas-value').html(newValueString);
                };

                updateSlider('contrast');

                // Create the slider
                $('#diva-canvas-slider').slider({
                    slide: function (event, ui) {
                        sliders[sliderMode].current = ui.value;
                        updateSliderLabel();
                        updateMap();
                    }
                });

                var updateSliderLabel = function () {
                    var thisSlider = sliders[sliderMode];
                    var value = thisSlider.current;
                    var stringValue = (thisSlider.transform) ? thisSlider.transform(value) : value;
                    $('#diva-canvas-value').html(stringValue);
                };

                var updateSliderValue = function () {
                    $('#diva-canvas-slider').slider({
                        value: sliders[sliderMode].current
                    });
                };

                // Update the thumbnail preview (called when a slider is moved/reset)
                var updateMap = function () {
                    rotateCanvas(map, sliders.rotation.current);
                    adjustLevels(map);
                };

                // Reset all the sliders to the default value
                $('#diva-canvas-reset-all').click(function () {
                    for (slider in sliders) {
                        sliders[slider].current = sliders[slider].initial;
                    }

                    // Change the value of the label
                    updateSliderLabel();
                    updateSliderValue();

                    // Update the preview
                    updateMap();
                });

                // Reset the current slider to the default value
                $('#diva-canvas-reset').click(function () {
                    // Update the current value and the slider
                    sliders[sliderMode].current = sliders[sliderMode].initial;
                    updateSliderLabel();
                    updateSliderValue();

                    // Update the preview
                    updateMap();
                });

                // Update the large canvas when the apply button is clicked
                $('#diva-canvas-apply').click(function () {
                    var timeout = 0;
                    if (shouldAdjustLevels()) {
                        // Only show the throbber if it will take a long time
                        if (sliders.zoom.current > 2) {
                            // The timeout is needed for the loading indicator to be shown
                            timeout = 200;
                            $('#diva-canvas-loading').fadeIn(timeout);
                        }

                        setTimeout(function () {
                            if (sliders.zoom.current !== sliders.zoom.previous) {
                                updateZoom(sliders.zoom.current);
                            } else {
                                updateCanvas();
                                hideThrobber();
                            }
                        }, timeout);
                    }
                });

                // Handle exiting canvas mode
                $('#diva-canvas-close').click(function () {
                    $('body').removeClass('overflow-hidden');

                    // Clear the canvases
                    // This needs to be improved - not done properly?
                    canvas.context.clearRect(0, 0, canvas.size, canvas.size);
                    map.context.clearRect(0, 0, map.size, map.size);
                    $('#diva-canvas-backdrop').hide();

                    // Reset everything
                    resetSliders();
                    updateSliderLabel();
                    updateSliderValue();
                    $('#diva-canvas-buttons .clicked').removeClass('clicked');
                    updateSlider('contrast');
                });

                // Hide the toolbar when the minimise icon is clicked
                $('#diva-canvas-minimise').click(function () {
                    $('#diva-canvas-tools').slideToggle('fast', function () {
                        $('#diva-canvas-minimise').toggleClass('active');
                    });
                });

                // Adjust the size of the canvas when the browser window is resized
                $(window).resize(function () {
                    settings.viewport = {
                        height: window.innerHeight - divaSettings.scrollbarWidth,
                        width: window.innerWidth - divaSettings.scrollbarWidth
                    };

                    // Always update the settings but only redraw if in canvas
                    if (settings.inCanvas) {
                        updateViewbox();
                    }
                });

                // Update the viewbox when the large canvas is scrolled
                $('#diva-canvas-wrapper').scroll(function () {
                    if (settings.inCanvas) {
                        updateViewbox();
                    }
                });

                // Handle clicking/dragging of the viewbox (should scroll the large canvas)
                $('#diva-canvas-minimap, #diva-map-viewbox').mouseup(function (event) {
                    var offsetY = 55;
                    var offsetX = 20;
                    var scaledX = (event.pageX - offsetX) / map.scaleFactor;
                    var scaledY = (event.pageY - offsetY) / map.scaleFactor;

                    $('#diva-canvas-wrapper').scrollTop(scaledY - settings.viewport.height / 2);
                    $('#diva-canvas-wrapper').scrollLeft(scaledX - settings.viewport.width / 2);
                });

                // Enable drag scroll
                $('#diva-canvas').mousedown(function () {
                    $(this).addClass('grabbing');
                }).mouseup(function () {
                    $(this).removeClass('grabbing');
                });

                $('#diva-canvas-wrapper').dragscrollable({
                    acceptPropagatedEvent: true
                });
            },
            pluginName: 'canvas',
            titleText: 'View the image on a canvas and adjust various settings',
            setupHook: function (divaSettings) {
                // Save the min and max zoom level, and update the zoom slider
                settings.minZoomLevel = divaSettings.minZoomLevel;
                settings.maxZoomLevel = divaSettings.maxZoomLevel;
                sliders.zoom.min = settings.minZoomLevel;
                sliders.zoom.max = settings.maxZoomLevel;
            },
            handleClick: function (event, divaSettings) {
                var zoomLevel = divaSettings.zoomLevel;

                sliders.zoom.initial = zoomLevel;
                sliders.zoom.current = zoomLevel;
                sliders.zoom.previous = zoomLevel;

                // Prevent scroll in body, and show the canvas backdrop
                $('body').addClass('overflow-hidden');
                $('#diva-canvas-backdrop').show();

                // Set this to true so events can be captured
                settings.inCanvas = true;

                // loadCanvas() calls all the other necessary functions to load
                var page = $(this).parent().parent();
                var filename = $(page).attr('data-filename');
                var width = $(page).width() - 1;
                settings.zoomWidthRatio = width / Math.pow(2, zoomLevel);
                settings.filename = filename;
                var imageURL = getImageURL(zoomLevel);

                loadCanvas(imageURL);
            },
            // Used only for running the unit tests
            destroy: function () {
                $('#diva-canvas-backdrop').remove();
            }
        };
    })());
})(jQuery);
