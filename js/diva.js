/*
Copyright (C) 2011 by Andrew Hankinson, Wendy Liu, Laurent Pugin

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

// this pattern was taken from http://www.virgentech.com/blog/2009/10/building-object-oriented-jquery-plugin.html
(function( $ ) {
    var Diva = function(element, options) {
        // These are elements that can be overridden upon instantiation
        var defaults =  {
            adaptivePadding: 0.05,      // The ratio of padding to the page dimension
            backendServer: '',          // The URL to the script returning the JSON data; mandatory
            enableAutoTitle: true,      // Shows the title within a div of id diva-title
            enableFullscreen: true,     // Enable or disable fullscreen mode
            enableGotoPage: true,       // A "go to page" jump box
            enableKeyScroll: true,      // Scrolling using the page up/down keys
            enableSpaceScroll: false,   // Scrolling down by pressing the space key
            enableZoomSlider: true,     // Enable or disable the zoom slider (for zooming in and out)
            fixedPadding: 0,            // Fallback if adaptive padding is set to 0
            iipServerBaseUrl: '',       // The URL to the IIPImage installation, including the ?FIF=
            maxZoomLevel: 0,            // Optional; defaults to the max zoom returned in the JSON response
            minZoomLevel: 0,            // Defaults to 0 (the minimum zoom)
            onJump: null,               // Callback function for jumping to a specific page (using the gotoPage feature)
            onScroll: null,             // Callback function for scrolling
            onScrollDown: null,         // Callback function for scrolling down, only
            onScrollUp: null,           // Callback function for scrolling up only
            onZoom: null,               // Callback function for zooming in general
            onZoomIn: null,             // Callback function for zooming in only
            onZoomOut: null,            // Callback function for zooming out only
            tileFadeSpeed: 500,         // The tile fade-in speed in ms. Set to 0 to disable tile fading. May also be "fast" or "slow".
            tileHeight: 256,            // The height of each tile, in pixels; usually 256
            tileWidth: 256,             // The width of each tile, in pixels; usually 256
            zoomLevel: 2                // The initial zoom level (used to store the current zoom level)
        };
        
        // Apply the defaults, or override them with passed-in options.
        var settings = $.extend({}, defaults, options);

        // Things that cannot be changed because of the way they are used by the script
        // Many of these are declared with arbitrary values that are changed later on
        var globals = {
            centerX: 0,                 // Only used if doubleClick is true - for zooming in
            centerY: 0,                 // Y-coordinate, see above
            dimAfterZoom: 0,            // Used for storing the item dimensions after zooming
            dimBeforeZoom: 0,           // Used for storing the item dimensions before zooming
            doubleClick: false,         // If the zoom has been triggered by a double-click event
            elementSelector: '',        // The ID of the element plus the # for easy selection, set in init()
            firstPageLoaded: -1,        // The ID of the first page loaded (value set later)
            firstAjaxRequest: true,     // True initially, set to false after the first request
            heightAbovePages: [],       // The height above each page
            horizontalOffset: 0,        // Used for storing the page offset before zooming
            horizontalPadding: 0,
            inFullScreen: false,        // Set to true when the user enters fullscreen mode
            itemTitle: '',              // The title of the document
            lastPageLoaded: -1,         // The ID of the last page loaded (value set later)
            maxHeight: 0,               // The height of the tallest page
            maxWidth: 0,                // The width of the widest page
            numPages: 0,                // Number of pages in the array
            pageLoadedId: 0,            // The current page in the viewport (center-most page)
            pages: [],                  // An array containing the data for all the pages
            panelHeight: 0,             // Height of the panel. Set in initiateViewer()
            panelWidth: 0,              // Width of the panel. Set in initiateViewer()
            prevVptTop: 0,              // Used to determine vertical scroll direction
            scaleWait: false,           // For preventing double-scale on the iPad
            scrollSoFar: 0,             // Holds the number of pixels of vertical scroll
            totalHeight: 0,             // Height of all the image stacked together, value set later
            verticalOffset: 0,          // Used for storing the page offset before zooming
            verticalPadding: 0,         
            viewerXOffset: 0,           // Distance between left edge of viewer and document left edge
            viewerYOffset: 0           // ^ for top edges
        };

        $.extend(settings, globals);

        // Checks if a page is within the viewport vertically
        var verticallyInViewport = function(top, bottom) {
            var panelHeight = settings.panelHeight;
            var topOfViewport = settings.scrollSoFar;
            var bottomOfViewport = topOfViewport + panelHeight;
           
            if (top >= topOfViewport && top <= bottomOfViewport) {
                // If top of page is in the viewport
                return true;
            } else if (bottom >= topOfViewport && bottom <= bottomOfViewport) {
                // Same as above for the bottom of the page
                return true;
            } else if (top <= topOfViewport && bottom >= bottomOfViewport) {
                // Top of page is above, bottom of page is below
                return true;
            } else {
                // The page is nowhere near the viewport, return 0
                return false;
            }
        };
        
        // Check if a page has been loaded (i.e. is visible to the user) 
        var isPageLoaded = function(pageIndex) {
            // Done using the length attribute in jQuery
            // If and only if the div does not exist, its length will be 0
            if ($(settings.selector + 'page-' + pageIndex).length === 0) {
                return false;
            } else {
                return true;
            }
        };
        
        // Check if a page is near the viewport and thus should be loaded
        var isPageVisible = function(pageIndex) {
            var topOfPage = settings.heightAbovePages[pageIndex];
            var bottomOfPage = topOfPage + settings.pages[pageIndex].h + settings.verticalPadding;
            return verticallyInViewport(topOfPage, bottomOfPage);
        };

        // Check if a specific tile is near the viewport and thus should be loaded (row-based only)
        var isTileVisible = function(pageIndex, tileRow, tileCol) {
            // Call near viewport
            var tileTop = settings.heightAbovePages[pageIndex] + (tileRow * settings.tileHeight) + settings.verticalPadding;
            var tileBottom = tileTop + settings.tileHeight;
            return verticallyInViewport(tileTop, tileBottom);
        };
        
        // Check if a tile has already been appended
        var isTileLoaded = function(pageIndex, tileNumber) {
            if ($(settings.selector + 'tile-' + pageIndex + '-' + tileNumber).length > 0) {
                return true;
            } else {
                return false;
            }
        };
       
        // Appends the page directly into the document body, or loads the relevant tiles
        var loadPage = function(pageIndex) {
            var content = [];
            var filename = settings.pages[pageIndex].fn;
            var rows = settings.pages[pageIndex].r;
            var cols = settings.pages[pageIndex].c;
            var width = settings.pages[pageIndex].w;
            var height = settings.pages[pageIndex].h;
            var maxZoom = settings.pages[pageIndex].m_z;
            var leftOffset, widthToUse;
            
            // Use an array as a string builder - faster than str concatentation
            var lastHeight, lastWidth, row, col, tileHeight, tileWidth, imgSrc;
            var tileNumber = 0;
            var heightFromTop = settings.heightAbovePages[pageIndex] + settings.verticalPadding;

            // Only try to append the div part if the page has not already been loaded
            if (!isPageLoaded(pageIndex)) {
                // If it's the max width:
                if (width === settings.maxWidth) {
                    // If it's larger than the panel (or almost), we use the standard horizontal padding
                    if (width >= settings.panelWidth - 2 * settings.horizontalPadding) {
                        leftOffset = settings.horizontalPadding;
                    } else {
                        leftOffset = (settings.panelWidth - width) / 2;
                    }
                } else {
                    // Smaller than the max width
                    widthToUse = (settings.maxWidth > settings.panelWidth) ? settings.maxWidth + 2 * settings.horizontalPadding : settings.panelWidth;
                    leftOffset = (widthToUse - width) / 2;
                }
                content.push('<div id="' + settings.ID + 'page-' + pageIndex + '" style="top: ' + heightFromTop + 'px; width:' + width + 'px; height: ' + height + 'px; left:' + leftOffset + 'px;" class="diva-page">');
            }

            // Calculate the width and height of the outer tiles (the ones that may have weird dimensions)
            lastHeight = height - (rows - 1) * settings.tileHeight;
            lastWidth = width - (cols - 1) * settings.tileWidth;
            var tilesToLoad = [];

            // Now loop through the rows and columns
            for (row = 0; row < rows; row++) {
                for (col = 0; col < cols; col++) {
                    var top = row * settings.tileHeight;
                    var left = col * settings.tileWidth;
                    // Set to none if there is a tileFadeSpeed set
                    var displayStyle = (settings.tileFadeSpeed) ? 'none' : 'inline';

                    // The zoom level might be different, if a page has a different max zoom level than the others
                    var zoomLevel = (maxZoom === settings.maxZoomLevel) ? settings.zoomLevel : settings.zoomLevel + (maxZoom - settings.maxZoomLevel); 
                    isTileVisible(pageIndex, row, col);
                    tileHeight = (row === rows - 1) ? lastHeight : settings.tileHeight; // If it's the LAST tile, calculate separately
                    tileWidth = (col === cols - 1) ? lastWidth : settings.tileWidth; // Otherwise, just set it to the default height/width
                    imgSrc = settings.iipServerBaseUrl + filename + '&amp;JTL=' + zoomLevel + ',' + tileNumber;
                    
                    if (!isTileLoaded(pageIndex, tileNumber) && isTileVisible(pageIndex, row, col)) {
                        content.push('<div id="' + settings.ID + 'tile-' + pageIndex + '-' + tileNumber + '"style="display: ' + displayStyle + '; position: absolute; top: ' + top + 'px; left: ' + left + 'px; background-image: url(\'' + imgSrc + '\'); height: ' + tileHeight + 'px; width: ' + tileWidth + 'px;"></div>');
                    }
                    tilesToLoad.push(tileNumber);
                    tileNumber++;
                }
            }
            if (!isPageLoaded(pageIndex)) {
                content.push('</div>');
                // Build the content string and append it to the document
                var contentString = content.join('');
                $(settings.innerSelector).append(contentString);
            } else {
                // Append it to the page
                $(settings.selector + 'page-' + pageIndex).append(content.join(''));
            }

            // Make the tiles we just appended fade in
            if(settings.tileFadeSpeed) {
                for (var i = 0; i < tilesToLoad.length; i++) {
                    $(settings.selector + 'tile-' + pageIndex + '-' + tilesToLoad[i]).fadeIn(settings.tileFadeSpeed);   
                }
            }
        };

        // Delete a page from the DOM; will occur when a page is scrolled out of the viewport
        var deletePage = function(pageIndex) {
            if (isPageLoaded(pageIndex)) {
                $(settings.selector + 'page-' + pageIndex).remove();
            }
        };

        // Private helper function, check if a page ID is valid
        var inRange = function(pageIndex) {
            if (pageIndex >= 0 && pageIndex < settings.numPages) {
                return true;
            } else {
                return false;
            }
        };

        // Private helper function, check if the bottom of a page is above the top of a viewport
        // For when you want to keep looping but don't want to load a specific page
        var aboveViewport = function(pageIndex) {
            var bottomOfPage = settings.heightAbovePages[pageIndex] + settings.pages[pageIndex].h + settings.verticalPadding;
            var topOfViewport = settings.scrollSoFar; 
            if ( bottomOfPage < topOfViewport ) {
                return true;
            }
            return false;
        };
        
        // Private helper function, check if the top of a page is below the bottom of a viewport
        // Used for scrolling up
        var belowViewport = function(pageIndex) {
            var topOfPage = settings.heightAbovePages[pageIndex];
            var bottomOfViewport = settings.scrollSoFar + settings.panelHeight;
            if ( topOfPage > bottomOfViewport ) {
                return true;
            }
            return false;
        };

        // Determines and sets the "current page" (settings.pageLoadedId); called within adjustPages 
        // The "direction" can be 0, 1 or -1; 1 for down, -1 for up, and 0 to go straight to a specific page
        var setCurrentPage = function(direction, pageIndex) {
            var currentPage = settings.pageLoadedId;
            var pageToConsider = settings.pageLoadedId + parseInt(direction, 10);
            var middleOfViewport = settings.scrollSoFar + (settings.panelHeight / 2);
            var changeCurrentPage = false;

            // When scrolling up:
            if ( direction < 0 ) {
                // If the current pageTop is below the middle of the viewport
                // Or the previous pageTop is below the top of the viewport
                if ( pageToConsider >= 0 && (settings.heightAbovePages[currentPage] >= middleOfViewport || settings.heightAbovePages[pageToConsider] >= settings.scrollSoFar) ) {
                    changeCurrentPage = true;
                }
            } else if ( direction > 0) {
                // When scrolling down:
                // If the previous pageBottom is above the top and the current page isn't the last page
                if ( settings.heightAbovePages[currentPage] + settings.pages[currentPage].h < settings.scrollSoFar && pageToConsider < settings.pages.length ) {
                    changeCurrentPage = true;
                }
            } else {
                // Just go straight to a certain page (for the goto function)
                changeCurrentPage = true;
                pageToConsider = pageIndex;
            }

            if ( changeCurrentPage ) {
                // Set this to the current page
                settings.pageLoadedId = pageToConsider;

                // Change the text to reflect this - pageToConsider + 1 (because it's page number not ID)
                $(settings.selector + 'current span').text(pageToConsider + 1);
                
                // Now try to change the next page, given that we're not going to a specific page
                // Calls itself recursively - this way we accurately obtain the current page
                if ( direction !== 0 ) {
                    setCurrentPage(direction);
                }
            }
        };

        // Called by adjust pages - see what pages should be visisble, and show them
        var attemptPageShow = function(pageIndex, direction) {
            if (direction > 0) {
                // Direction is positive - we're scrolling down
                // Should we add this page to the DOM? First check if it's a valid page
                if (inRange(pageIndex)) {
                    // If it's near the viewport, yes, add it
                    if (isPageVisible(pageIndex)) {
                        loadPage(pageIndex);

                        // Reset the last page loaded to this one
                        settings.lastPageLoaded = pageIndex;

                        // Recursively call this function until there's nothing to add
                        attemptPageShow(settings.lastPageLoaded+1, direction);
                    } else if (aboveViewport(pageIndex)) {
                        // Otherwise, is it below the viewport?
                        // Do not increment last page loaded, that would be lying
                        // Attempt to call this on the next page
                        attemptPageShow(pageIndex + 1, direction);
                    }
                } else {
                    // Nothing to do ... return
                    return;
                }
            } else {
                // Direction is negative - we're scrolling up
                if (inRange(pageIndex)) {
                    // If it's near the viewport, yes, add it
                    if (isPageVisible(pageIndex)) {
                        loadPage(pageIndex);

                        // Reset the first page loaded to this one
                        settings.firstPageLoaded = pageIndex;

                        // Recursively call this function until there's nothing to add
                        attemptPageShow(settings.firstPageLoaded-1, direction);
                    } else if (belowViewport(pageIndex)) {
                        // Attempt to call this on the next page, do not increment anything
                        attemptPageShow(pageIndex-1, direction);
                    }
                } else {
                    // Nothing to do ... return
                    return;
                }
            }
        };

        // Called by adjustPages - see what pages need to be hidden, and hide them
        var attemptPageHide = function(pageIndex, direction) {
            if (direction > 0) {
                // Direction is positive - we're scrolling down
                // Should we delete this page from the DOM?
                if (inRange(pageIndex) && aboveViewport(pageIndex)) {
                    // Yes, delete it, reset the first page loaded
                    deletePage(pageIndex);
                    settings.firstPageLoaded++;

                    // Try to call this function recursively until there's nothing to delete
                    attemptPageHide(settings.firstPageLoaded, direction);
                } else {
                    // Nothing to delete - return
                    return;
                }
            } else {
                // Direction must be negative (not 0, see adjustPages), we're scrolling up
                if (inRange(pageIndex) && belowViewport(pageIndex)) {
                    // Yes, delete it, reset the last page loaded
                    deletePage(pageIndex);
                    settings.lastPageLoaded--;
                    
                    // Try to call this function recursively until there's nothing to delete
                    attemptPageHide(settings.lastPageLoaded, direction);
                } else {
                    return;
                }
            }
        };

        // Handles showing and hiding pages when the user scrolls
        var adjustPages = function(direction) {
            // Direction is negative, so we're scrolling up
            if (direction < 0) {
                attemptPageShow(settings.firstPageLoaded, direction);
                setCurrentPage(-1);
                attemptPageHide(settings.lastPageLoaded, direction);
            } else if (direction > 0) {
                // Direction is positive so we're scrolling down
                attemptPageHide(settings.firstPageLoaded, direction);
                attemptPageShow(settings.lastPageLoaded, direction);
                setCurrentPage(1);
            }

            // Handle the scrolling callback functions here
            if (typeof settings.onScroll == 'function' && direction !== 0) {
                settings.onScroll.call(this, settings.pageLoadedId);
            }
            if (typeof settings.onScrollUp == 'function' && direction < 0) {
                settings.onScrollUp.call(this, settings.pageLoadedId);
            }
            if (typeof settings.onScrollDown == 'function' && direction > 0) {
                settings.onScrollDown.call(this, settings.pageLoadedId);
            }
        };
        
        // Helper function called by ajaxRequest to scroll to the desired place
        var scrollAfterRequest = function() {
            // The x and y coordinates of the center ... let's zoom in on them
            var centerX, centerY, desiredLeft, desiredTop;
            
            // Determine the zoom change ratio - if first ajax request, set to 1
            var zChangeRatio = (settings.dimBeforeZoom > 0) ? settings.dimAfterZoom / settings.dimBeforeZoom : 1;
                
            // First figure out if we need to zoom in on a specific part (if doubleclicked)
            if (settings.doubleClick) {
                centerX = settings.centerX * zChangeRatio;
                centerY = settings.centerY * zChangeRatio;
                desiredLeft = Math.max((centerX) - (settings.panelWidth / 2), 0);
                desiredTop = Math.max((centerY) - (settings.panelHeight / 2), 0);
            } else {
                // This isn't working just zoom in on the middle for now
                if ( settings.maxWidth + settings.horizontalPadding * 2 <= settings.panelWidth ) {
                    desiredLeft = 0;
                } else {
                    desiredLeft = settings.maxWidth / 2 - settings.panelWidth / 2 + settings.horizontalPadding;
                }

                // Either do the expected zoom or zoom in on the middle
                desiredLeft = ( settings.horizontalOffset > 0 ) ? settings.horizontalOffset * zChangeRatio : settings.maxWidth / 2 - settings.panelWidth / 2 + settings.horizontalPadding;
                desiredTop = settings.verticalOffset * zChangeRatio;
            }
            
            settings.prevVptTop = 0;
            $(settings.outerSelector).scrollTop(desiredTop);
            $(settings.outerSelector).scrollLeft(desiredLeft);
        };
        
        // AJAX request to start the whole process - called upon page load and upon zoom change
        var ajaxRequest = function(zoomLevel) {
            $.ajax({
                // Works now - using proxy_pass for nginx to forward to the other port
                url: settings.backendServer + '&z=' + zoomLevel,
                cache: false, // debugging
                context: this, // for later
                dataType: "json",
                success: function(data) {
                    // If it's the first AJAX request, store some variables that won't change with each zoom
                    if (settings.firstAjaxRequest) {
                        settings.itemTitle = data.item_title;
                        settings.numPages = data.pgs.length;
                        settings.maxZoomLevel = (settings.maxZoomLevel > 0) ? settings.maxZoomLevel : data.max_zoom;

                        // Set the total number of pages
                        $(settings.selector + 'current label').text(settings.numPages);

                        // Create the zoomer here, if needed
                        if (settings.enableZoomSlider) {
                            createZoomSlider();
                        }

                        // Change the title to the actual title if the setting is enabled
                        if (settings.enableAutoTitle) {
                            $(settings.elementSelector).prepend('<div id="' + settings.ID + 'title">' + settings.itemTitle + '</div>');
                        }
                        
                        // Calculate the horizontal and vertical inter-page padding
                        if (settings.adaptivePadding > 0) {
                            settings.horizontalPadding = data.dims.a_wid * settings.adaptivePadding;
                            settings.verticalPadding = data.dims.a_hei * settings.adaptivePadding;
                        } else {
                            // It's less than or equal to 0; use fixedPadding instead
                            settings.horizontalPadding = settings.fixedPadding;
                            settings.verticalPadding = settings.fixedPadding;
                        }
                    }

                    // Reset the vertical scroll and clear out the innerdrag div
                    $(settings.outerSelector).scrollTop(0);
                    $(settings.innerSelector).text('');                   

                    // Now reset some things that need to be changed after each zoom
                    settings.pages = data.pgs;
                    settings.totalHeight = data.dims.t_hei + settings.verticalPadding * (settings.numPages + 1); 
                    settings.zoomLevel = zoomLevel;
                    settings.maxWidth = data.dims.mx_w;
                    settings.maxHeight = data.dims.mx_h;
                    settings.dimAfterZoom = settings.totalHeight; 
                    settings.firstPageLoaded = 0;

                    // Needed to set settings.heightAbovePages - initially just the top padding
                    var heightSoFar = 0;

                    var i;
                    for (i = 0; i < settings.numPages; i++) {                 
                        // First set the height above that page by adding this height to the previous total
                        // A page includes the padding above it
                        settings.heightAbovePages[i] = heightSoFar;

                        // Has to be done this way otherwise you get the height of the page included too
                        heightSoFar = settings.heightAbovePages[i] + settings.pages[i].h + settings.verticalPadding;

                        // Now try to load the page ONLY if the page needs to be loaded
                        // Take scrolling into account later, just try this for now
                        if (isPageVisible(i)) {
                            loadPage(i);
                            settings.lastPageLoaded = i;
                        }
                    }
                    
                    // Set the height and width of documentpane (necessary for dragscrollable)
                    $(settings.innerSelector).css('height', settings.totalHeight);
                    var widthToSet = (data.dims.mx_w + settings.horizontalPadding * 2 < settings.panelWidth ) ? settings.panelWidth : data.dims.mx_w + settings.horizontalPadding * 2; // width of page + 40 pixels on each side if necessary
                    $(settings.innerSelector).css('width', widthToSet);

                    // Scroll to the proper place
                    scrollAfterRequest();

                    // Now execute the zoom callback functions (if it's not the first)
                    // Note that this also gets executed after entering or leaving fullscreen mode
                    if (!settings.firstAjaxRequest) {
                        // If the callback function is set, execute it
                        if (typeof settings.onZoom == 'function') {
                            settings.onZoom.call(this, zoomLevel);
                        }

                        // Execute the zoom in/out callback function if necessary
                        if (settings.dimBeforeZoom > settings.dimAfterZoom) {
                            // Zooming out
                            if (typeof settings.onZoomOut == 'function') {
                                settings.onZoomOut.call(this, zoomLevel);
                            }
                        } else if (settings.dimBeforeZoom < settings.dimAfterZoom) {
                            // Zooming in
                            if (typeof settings.onZoomIn == 'function') {
                                settings.onZoomIn.call(this, zoomLevel);
                            }
                        }
                    }

                    // For use in the next ajax request (zoom change)
                    settings.dimBeforeZoom = settings.dimAfterZoom;

                    settings.firstAjaxRequest = false;

                    // For the iPad - wait until this request finishes before accepting others
                    if (settings.scaleWait) {
                        settings.scaleWait = false;
                    }
                } // ends the success function
            }); // ends the $.ajax function
        };
        
        // Called whenever there is a scroll event in the document panel (the #diva-outer element)
        var handleScroll = function() {
            settings.scrollSoFar = $(settings.outerSelector).scrollTop();
            adjustPages(settings.scrollSoFar - settings.prevVptTop);
            settings.prevVptTop = settings.scrollSoFar;
        };

        // Handles zooming - called after pinch-zoom, changing the slider, or double-clicking
        var handleZoom = function(zoomLevel) {
            // First make sure that this is an actual zoom request
            if (settings.zoomLevel != zoomLevel) {
                // Now do an ajax request with the new zoom level
                ajaxRequest(zoomLevel);

                // Make the slider display the new value (it may already)
                $(settings.selector + 'zoom-slider').slider({
                    value: zoomLevel
                });
            }
        };

        // Called whenever the zoom slider is moved
        var handleZoomSlide = function(zoomLevel) {
            // First get the vertical offset (vertical scroll so far)
            settings.verticalOffset = $(settings.outerSelector).scrollTop();
            settings.horizontalOffset = $(settings.outerSelector).scrollLeft();
            
            // Let handleZoom handle zooming
            settings.doubleClick = false;
            handleZoom(zoomLevel);
        };

        // Private function for going to a page
        var gotoPage = function(pageNumber) {
            // Since we start indexing from 0, subtract 1 to behave as the user expects
            pageNumber--;

            // First make sure that the page number exists (i.e. is in range)
            if ( inRange(pageNumber) ) {
                var heightToScroll = settings.heightAbovePages[pageNumber];

                // Change the "currently on page" thing
                setCurrentPage(0, pageNumber);
                $(settings.outerSelector).scrollTop(heightToScroll);

                // Now execute the callback function if it is defined
                if (typeof settings.onJump == 'function') {
                    // Pass it the page number, +1 as the user expects
                    settings.onJump.call(this, pageNumber+1);
                }

                return true; // To signify that we can scroll to this page
            }
            return false;
        };
        
        // Handles the double click event, put in a new function for better codeflow
        var handleDoubleClick = function(event, viewer) {
                // If the zoom level is already at max, zoom out
                var newZoomLevel;
                if (settings.zoomLevel === settings.maxZoomLevel) {
                    if (event.ctrlKey) {
                        newZoomLevel = settings.zoomLevel - 1;
                    } else {
                        return;
                    }
                } else if (settings.zoomLevel === settings.minZoomLevel) {
                    if (event.ctrlKey) {
                        return;
                    } else {
                        newZoomLevel = settings.zoomLevel + 1;
                    }
                } else {
                    if (event.ctrlKey) {
                        newZoomLevel = settings.zoomLevel - 1;
                    } else {
                        newZoomLevel = settings.zoomLevel + 1;
                    }
                }

                
                // Set centerX and centerY for scrolling in after zoom
                // Need to use this.offsetLeft and this.offsetTop to get it relative to the edge of the document
                settings.centerX = (event.pageX - settings.viewerXOffset) + $(settings.outerSelector).scrollLeft();
                settings.centerY = (event.pageY - settings.viewerYOffset) + $(settings.outerSelector).scrollTop();

                // Set doubleClick to true, so we know where to zoom
                settings.doubleClick = true;
                
                // Zoom
                handleZoom(newZoomLevel);
        };

        // Bound to an event handler if iStuff detected; prevents window dragging
        var blockMove = function(event) {
            event.preventDefault();
        };

        // Allows pinch-zooming for iStuff
        var scale = function(event) {
            var newZoomLevel = settings.zoomLevel;

            // First figure out the new zoom level:
            if (event.scale > 1 && newZoomLevel < settings.maxZoomLevel) {
                newZoomLevel++;
            } else if (event.scale < 1 && newZoomLevel > settings.minZoomLevel) {
                newZoomLevel--;
            } else {
                return;
            }

            // Set it to true so we have to wait for this one to finish
            settings.scaleWait = true;

            // Has to call handleZoomSlide so that the coordinates are kept
            handleZoomSlide(newZoomLevel);
        };

        // Handles all the events
        var handleEvents = function() {
            // Create the fullscreen toggle icon if fullscreen is enabled
            if (settings.enableFullscreen) {
                // Event handler for fullscreen toggling
                $(settings.selector + 'fullscreen').click(function() {
                    if (settings.inFullScreen) {
                        $(settings.outerSelector).removeClass('fullscreen');
                        settings.inFullScreen = false;

                        // Return the body overflow to auto and the fullscreen icon to its original place
                        $('body').css('overflow', 'auto');
                        $(settings.selector + 'fullscreen').css('position', 'absolute').css('z-index', '8999');
                    } else {
                        // Change the styling of the fullscreen icon - two viewers on a page won't work otherwise
                        $(settings.selector + 'fullscreen').css('position', 'fixed').css('z-index', '9001');
                        
                        $(settings.outerSelector).addClass('fullscreen');
                        settings.inFullScreen = true;

                        // Make the body overflow hidden
                        $('body').css('overflow', 'hidden');

                    }
                    // Store the offsets so the user stays in the same place
                    settings.verticalOffset = $(settings.outerSelector).scrollTop();
                    settings.horizontalOffset = $(settings.outerSelector).scrollLeft();
                    settings.doubleClick = false;

                    // Recalculate height and width
                    settings.panelWidth = parseInt($(settings.outerSelector).width(), 10) - 20;
                    settings.panelHeight = parseInt($(settings.outerSelector).height(), 10);

                    // Change the width of the inner div correspondingly
                    $(settings.innerSelector).width(settings.panelWidth);
                    // Do another AJAX request to fix the padding and so on
                    ajaxRequest(settings.zoomLevel);
                });

            }

            // Change the cursor for dragging.
            $(settings.innerSelector).mouseover(function() {
                $(this).removeClass('grabbing').addClass('grab');
            });
            
            $(settings.innerSelector).mouseout(function() {
                $(this).removeClass('grab');
            });
            
            $(settings.innerSelector).mousedown(function() {
                $(this).removeClass('grab').addClass('grabbing');
            });
            
            $(settings.innerSelector).mouseup(function() {
                $(this).removeClass('grabbing').addClass('grab');
            });

            // Handle the scroll
            $(settings.outerSelector).scroll(function() {
                handleScroll();
            });
            
            // Set drag scroll on first descendant of class dragger on both selected elements
            $(settings.outerSelector + ', ' + settings.innerSelector).dragscrollable({dragSelector: '.dragger', acceptPropagatedEvent: true});
            
            // Double-click to zoom
            $(settings.outerSelector).dblclick(function(event) {
                // First set the x and y offsets of the viewer from the edge of document
                settings.viewerXOffset = this.offsetLeft;
                settings.viewerYOffset = this.offsetTop;

                handleDoubleClick(event);
            });

            // Prevent the context menu within the outerdrag IF it was triggered with the ctrl key
            $(settings.outerSelector).bind("contextmenu", function(event) {
                var e = event.originalEvent;
                if (e.ctrlKey) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            });

            // Check if the user is on a iPhone or iPod touch or iPad
            if (navigator.userAgent.match(/iPhone/i) || navigator.userAgent.match(/iPad/i) || navigator.userAgent.match(/iPod/i)) {
                // One-finger scroll within outerdrag
                $(settings.outerSelector).oneFingerScroll();

                // Prevent resizing (below from http://matt.might.net/articles/how-to-native-iphone-ipad-apps-in-javascript/)
                var toAppend = [];
                toAppend.push('<meta name="viewport" content="user-scalable=no, width=device-width" />');

                // Eliminate URL and button bars if added to home screen
                toAppend.push('<meta name="apple-mobile-web-app-capable" content="yes" />');

                // Choose how to handle the phone status bar
                toAppend.push('<meta name="apple-mobile-web-app-status-bar-style" content="black" />');
                $('head').append(toAppend.join('\n'));

                // Block the user from moving the window
                $('body').bind('touchmove', function(event) {
                    var e = event.originalEvent;
                    blockMove(e);
                });

                // Allow pinch-zooming
                $('body').bind('gestureend', function(event) {
                    var e = event.originalEvent;
                    if (!settings.scaleWait) {
                        scale(e);
                    }
                    return false;
                });

            }

            // Only check if either scrollBySpace or scrollByKeys is enabled
            if (settings.enableSpaceScroll || settings.enableKeyScroll) {
                var spaceKey = $.ui.keyCode.SPACE;
                var pageUpKey = $.ui.keyCode.PAGE_UP;
                var pageDownKey = $.ui.keyCode.PAGE_DOWN;

                // Catch the key presses in document
                $(document).keydown(function(event) {
                    // Space or page down - go to the next page
                    if ((settings.enableSpaceScroll && event.keyCode == spaceKey) || (settings.enableKeyScroll && event.keyCode == pageDownKey)) {
                        $(settings.outerSelector).scrollTop(settings.scrollSoFar + settings.panelHeight);
                        return false;
                    }

                    // Page up - go to the previous page
                    if (settings.enableKeyScroll && event.keyCode == pageUpKey) {
                        $(settings.outerSelector).scrollTop(settings.scrollSoFar - settings.panelHeight);
                        return false;
                    }
                });
            }

        };

        // Creates a zoomer using the min and max zoom levels specified ... PRIVATE, only if zoomSlider = true
        var createZoomSlider = function() {
            $(settings.selector + 'tools').prepend('<div id="' + settings.ID + 'zoom-slider"></div>');
            $(settings.selector + 'zoom-slider').slider({
                    value: settings.zoomLevel,
                    min: settings.minZoomLevel,
                    max: settings.maxZoomLevel,
                    step: 1,
                    slide: function(event, ui) {
                        handleZoomSlide(ui.value);
                    }
                });
        };
        
        // Creates the gotoPage thing
        var createGotoPage = function() {
            $(settings.selector + 'tools').append('<div id="' + settings.ID + 'goto-page">Go to page <input type="text" size="3" id="' + settings.ID + 'goto-input" /> <input type="submit" id="' + settings.ID + 'goto-submit" value="Go" /><br /><div id="' + settings.ID + 'current">Current page: <span>1</span> of <label></label></div></div>');
            
            $(settings.selector + 'goto-submit').click(function() {
                var desiredPage = parseInt($(settings.selector + 'goto-input').val(), 10);
                if ( !gotoPage(desiredPage) ) {
                    alert('Invalid page number');
                }
            });
        };

        
        var init = function() {
            // For easier selecting of the container element
            settings.elementSelector = '#' + $(element).attr('id');
   
            // Generate an ID that can be used as a prefix for all the other IDs
            settings.ID = $.generateId('diva-');
            settings.selector = '#' + settings.ID;
            
            // Since we need to reference these two a lot
            settings.outerSelector = settings.selector + 'outer';
            settings.innerSelector = settings.selector + 'inner';
            
            // If we need either a zoom slider or a gotoPage thing, create a "viewertools" div
            if (settings.zoomSlider || settings.enableGotoPage) {
                $(settings.elementSelector).prepend('<div id="' + settings.ID + 'tools"></div>');
            }
            
            if (settings.enableGotoPage) {
                createGotoPage();
            }
            
            // Create the inner and outer panels
            $(settings.elementSelector).append('<div id="' + settings.ID + 'outer"></div>');
            $(settings.outerSelector).append('<div id="' + settings.ID + 'inner" class="dragger"></div>');
            
            // Get the height and width of the diva-outer element
            settings.panelWidth = parseInt($(settings.outerSelector).width(), 10) - 18; // for the scrollbar change later
            settings.panelHeight = parseInt($(settings.outerSelector).height(), 10);
            
            // Create the fullscreen icon
            if (settings.enableFullscreen) {
                $(settings.elementSelector).prepend('<div id="' + settings.ID + 'fullscreen"></div>');
            }
            
            // Load the images at the initial zoom level            
            ajaxRequest(settings.zoomLevel);
        
            handleEvents();
        };

        // call the init function when this object is created.
        init();

        // Public function, returns the title of the document
        this.getItemTitle = function() {
            return settings.itemTitle;
        };

        // Public function for going to a specific page, returns false if that page is invalid
        this.gotoPage = function(pageNumber) {
            return gotoPage(pageNumber);
        };

        // Public function, returns the current page that the user is on
        this.getCurrentPage = function() {
            return settings.pageLoadedId;
        };

        // Public function, returns the current zoom level
        this.getZoomLevel = function() {
            return settings.zoomLevel;
        };
    };
    
    /// this should not need to be changed.
    $.fn.diva = function(options) {
        return this.each(function() {
            var element = $(this);
            // Return early if this element already has a plugin instance
            
            if (element.data('diva')) {
                return;
            }
            
            var diva = new Diva(this, options);
            element.data('diva', diva);
        });
    };
    
})( jQuery );
