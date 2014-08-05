/*
Textual annotation plugin for diva.js
Allows you to highlight regions of a page image
*/

(function ($)
{
    "use strict";

    /**
     * A UUID helper function that I found online.
     */
    var guid = (function()
    {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }
        return function() {
            return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
                s4() + '-' + s4() + s4() + s4();
        };
    })();


    window.divaPlugins.push((function()
    {
        var settings = {};
        var retval =
        {
            init: function(divaSettings, divaInstance)
            {
                // It's useful to keep track of this
                var divaOuter = $(divaSettings.parentSelector.selector + " .diva-outer");

                // Create the pop-up window.
                $(divaSettings.parentSelector).append('<div class="diva-annotate-window">TEST!</div>');
                var annotationsDiv = $(".diva-annotate-window");
                _render_annotate_window();

                var annotationObj = {};

                /**
                 * This list contains the yellow note divs currently instantiated.
                 * We will flush this div frequently.
                 *
                 * @type {Array}
                 */
                var noteDivCollection = [];

                // Event handlers
                diva.Events.subscribe("VisiblePageDidChange", _page_change_event_handler);
                diva.Events.subscribe("HighlightCompleted", _prepare_clickable_annotations);

                /*
                Classes
                 */

                var Annotation = (function () {
                    function Annotation(x, y) {
                        /*
                         Class fields
                         */
                        this.text = "LOL I'M A NOTE.";
                        // Whether or not the window is opened.
                        this.isOpen = false;
                        // Location
                        this.x = 0;
                        this.y = 0;
                        this.noteDiv = null;
                        this.editWindow = null;

                        // A UUID for identifying the note
                        this.uuid = guid();

                        /*
                         Construction
                         */
                        this.setX(x);
                        this.setY(y);

                        // Create the note div
                        $(divaSettings.parentSelector).find(".diva-outer").append('<div class="annotation ' + this.uuid + '" title=" ' + this.text + ' "></div>');
                        // Pick out the note div so that we can keep track
                        this.noteDiv = divaSettings.parentSelector.find("." + this.uuid);
                        // Make the note draggable
                        this.bindDraggable();
                        console.log(this.noteDiv);
                        // Open on click
                        this.noteDiv.click(this.open);
                    }

                    /**
                     * Set the X location of the note.
                     *
                     * @param pX
                     */
                    Annotation.prototype.setX = function (pX) {
                        this.x = parseInt(pX);
                    };

                    /**
                     * Set the Y location of the note.
                     *
                     * @param pY
                     */
                    Annotation.prototype.setY = function (pY) {
                        this.y = parseInt(pY);
                    };

                    /**
                     * Open the edit window for the given note.
                     */
                    Annotation.prototype.open = function ()
                    {
                        console.log(this.isOpen);
                        if (this.isOpen === false) {
                            // Create the edit window
                            $(divaSettings.parentSelector).append(
                                '<div class="' + this.uuid + '">Test</div>');
                            this.editWindow = $(divaSettings.parentSelector + " ");
                            this.isOpen = true;
                        }
                    };

                    Annotation.prototype.bindDraggable = function ()
                    {
                        var dragging = false;
                        var note = this.noteDiv;

                        note.mousedown(function()
                            {
                                console.log("mousedown");
                                $(window).mousemove(function(event)
                                {
                                    dragging = true;

                                    var parentOffset = note.parent().offset();
                                    var relativeXPosition = (event.pageX - parentOffset.left) + parseInt($(divaOuter).scrollLeft(), 10) - 10; //offset -> method allows you to retrieve the current position of an element 'relative' to the document
                                    var relativeYPosition = (event.pageY - parentOffset.top) + parseInt($(divaOuter).scrollTop(), 10) - 10;

                                    note.css(
                                        {
                                            left: relativeXPosition,
                                            top: relativeYPosition
                                        }
                                    );
                                });
                            });
                        // Listen for all mouse-ups
                        $(document).mouseup(function()
                            {
                                console.log("Drag end");
                                dragging = false;
                                $(window).unbind("mousemove");
                                // TODO: Persist the new X and Y locations
                            });
                    };

                    /**
                     * Close the edit window
                     */
                    Annotation.prototype.close = function () {
                        if (this.isOpen)
                        {
                            this.editWindow.remove();
                            this.isOpen = false;
                        }
                    };

                    Annotation.prototype.renderNote = function () {
                        this.noteDiv.setX(this.x);
                        this.noteDiv.setY(this.y);
                    };
                    return Annotation;
                })();


                /*
                 * Private functions
                 */

                /**
                 * Callback function fired when the page changes.
                 *
                 * @param pageIdx
                 * @param pageName
                 * @private
                 */
                function _page_change_event_handler(pageIdx, pageName)
                {
                    // Save the current page
                    var currentPage = pageIdx;
                    // Point to the correct

//                    if (annotationObj.page[pageIdx])
//                    {
//                        // Print it out to the console.
//                        diva.Events.publish("PageAnnotation", [annotationObj.page[pageIdx]]);
//
//                    }
                }


                /**
                 * Render the entire bookmarks window.
                 *
                 * @private
                 */
                function _render_annotate_window()
                {
                    // So that we don't have memory leaks
                    annotationsDiv.empty();

                    var content = '<div class="diva-annotate-window-form"><div class="diva-annotate-window-toolbar">' +
                        '<div class="diva-annotate-window-close" ' +
                        'title="Close the bookmarks window"></div></div>';

                    content += '<h3>Create Annotation</h3> <form class="create-annotation">' +
                        '<textarea rows="4" cols="35" class="annotation-name" placeholder="Name"></textarea>' +
                        '<input type="submit" value="Create"></form></div>';

                    // Fill it with the content
                    annotationsDiv.html(content);

                    annotationsDiv.find(".create-annotation").each(
                        function()
                        {
                            $(this).submit(
                                function(event)
                                {
                                    event.preventDefault();
                                    var name = annotationsDiv.find(".annotation-name").val();
                                    divaInstance.bookmarkCurrentLocation(name);
                                }
                            );
                        }
                    );
                    annotationsDiv.find(".diva-annotate-window-close").click(
                        function()
                        {
                            annotationsDiv.hide();
                        }
                    );
                }


                /**
                 *
                 * @param {type} pageIdx
                 * @param {type} filename
                 * @param {type} pageSelector
                 * @returns {undefined}
                 */
                function _annotate_area(pageIdx, filename, pageSelector)
                {
                    if (typeof annotationObj === 'undefined')
                    {
                        return;
                    }


                    diva.Events.publish("AnnotateAreaCompleted");
                }

                function _prepare_clickable_annotations()
                {
                    // Get all of currently visible pages
                    var visiblePages = [];
                    var currentPage = divaInstance.getCurrentPageIndex();
                    visiblePages.push(currentPage);
                    // Pages above the current
                    for (var i = currentPage + 1; i < divaInstance.getNumberOfPages(); i++)
                    {
                        if (divaInstance.isPageInViewport(i))
                        {
                            visiblePages.push(i);
                        }
                        else
                        {
                            break;
                        }
                    }
                    // Pages below the current
                    for (i = currentPage - 1; i >= 0; i--)
                    {
                        if (divaInstance.isPageInViewport(i))
                        {
                            visiblePages.push(i);
                        }
                        else
                        {
                            break;
                        }
                    }
                    visiblePages = visiblePages.sort(function(a,b){return a-b;});
                    console.log(visiblePages);

                    // We now have the visible pages, so we want to prepare the
                    // clickable boxes on those pages




                }

//                function _calculate_pointer_collision(boxes)
//                {
//                    // Store a list of x
////                    var xCollisions = [];
//
//                }


                /*
                 * Public functions
                 */

                divaInstance.createAnnotation = function()
                {
                    annotationObj.push(new Annotation(0,0));
                };

                /**
                 * Bind a text annotation to an entire page.
                 *
                 * @param {type} pageIdx
                 * @param {type} textContent
                 * @returns {undefined}
                 */
                divaInstance.annotatePage = function(pageIdx, textContent)
                {
                    // Save it
                    annotationObj.page[pageIdx] = String(textContent);
                };

                /**
                 * Flushes all of the Page Annotations
                 */
                divaInstance.removeAllPageAnnotations = function()
                {
                    // Clear out the page annotations
                    annotationObj.page = {};
                };

                divaInstance.annotateAreaOnPage = function(pageIdx, textContent)
                {
                    // Create the corresponding highlight box
//                    divaInstance.highlightOnPage(pageIdx, regions, colour, divClass);

                    // Prepare for the annotation
                    if (annotationObj.area[pageIdx] === undefined)
                    {
                       // No annotation has been added to this page yet
                       annotationObj.area[pageIdx] = [];
                    }
                    // Add it to the list
                    annotationObj.area[pageIdx].push(String(textContent));
                };

                divaInstance.getAnnotations = function()
                {
                   return annotationObj;
                };

                return true;
            },
            handleClick: function()
            {
                $(".diva-annotate-window").show();
                return false;
            },
            pluginName: 'annotate',
            titleText: 'Annotate text on page'
        };
        return retval;
    })());
})(jQuery);
