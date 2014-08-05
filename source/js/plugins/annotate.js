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
                $(divaSettings.parentSelector).find(".diva-outer").append('<div class="diva-annotate-window">TEST!</div>');
                var annotationsDiv = $(".diva-annotate-window");

                var annotationObj = [];

                /**
                 * This list contains the yellow note divs currently instantiated.
                 * We will flush this div frequently.
                 *
                 * @type {Array}
                 */
                var visibleAnnotations = [];

                // Event handlers
                diva.Events.subscribe("VisiblePageDidChange", _prepare_clickable_annotations);

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
                        this.pageIdx = 0;

                        this.noteDiv = null;

                        // A UUID for identifying the note
                        this.uuid = guid();

                        /*
                         Construction
                         */
                        this.setX(x);
                        this.setY(y);

                        this.render();
                    }

                    /**
                     * Set the note's text.
                     */
                    Annotation.prototype.setText = function (newText)
                    {
                        this.noteDiv.prop('title', String(newText));
                        this.text = String(newText);
                    };

                    /**
                     * Set the X location of the note.
                     *
                     * @param pX
                     */
                    Annotation.prototype.setX = function (pX)
                    {
                        this.x = parseInt(pX);
                    };

                    /**
                     * Set the Y location of the note.
                     *
                     * @param pY
                     */
                    Annotation.prototype.setY = function (pY)
                    {
                        // Save the y coordinate
                        this.y = parseInt(pY);
                        // Save the page index
                        this.pageIdx = divaInstance.getCurrentPageIndex();
                    };

                    /**
                     * Get the properties of the Annotation as a javascript
                     * object.
                     *
                     * @returns {{x: *, y: *, page: number, text: *}}
                     */
                    Annotation.prototype.getProperties = function ()
                    {
                        return {
                            x: this.x,
                            y: this.y,
                            page: this.pageIdx,
                            text: this.text
                        };
                    };

                    /**
                     * Open the edit window for the given note.
                     */
                    Annotation.prototype.open = function ()
                    {
                        console.log(this.isOpen);
                        if (this.isOpen === false) {
                            // Create the edit window and fill it with our content
                            _render_annotate_window(this);
                            annotationsDiv.show();
                            // Place the edit window beside the note
                            annotationsDiv.css({top: this.y + 30, left: this.x + 30});
                            this.isOpen = true;
                        }
                    };

                    Annotation.prototype.bindDraggable = function ()
                    {
                        var dragging = false;
                        var note = this.noteDiv;
                        var self = this;

                        var relativeXPosition;
                        var relativeYPosition;

                        note.mousedown(function()
                            {
                                console.log("mousedown");
                                // Create the edit window
                                self.close();
                                self.open();
                                // Handle drag if applicable
                                $(window).mousemove(function(event)
                                {
                                    // Close the edit window if it's open
                                    self.close();
                                    // Do the drag
                                    dragging = true;
                                    var parentOffset = note.parent().offset();
                                    relativeXPosition = (event.pageX - parentOffset.left) + parseInt($(divaOuter).scrollLeft(), 10) - 10;
                                    relativeYPosition = (event.pageY - parentOffset.top) + parseInt($(divaOuter).scrollTop(), 10) - 10;
                                    // Use CSS to move the div
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
                                $(window).unbind("mousemove");
                                if (dragging === true)
                                {
                                    dragging = false;
                                    self.setX(relativeXPosition);
                                    self.setY(relativeYPosition);
                                }
                            });
                    };

                    /**
                     * Close the edit window
                     */
                    Annotation.prototype.close = function () {
                        if (this.isOpen)
                        {
                            annotationsDiv.hide();
                            this.isOpen = false;
                        }
                    };

                    /**
                     * Add the note Div to the browser.
                     */
                    Annotation.prototype.render = function ()
                    {
                        // Create the note div
                        $(divaSettings.parentSelector).find(".diva-outer").append('<div class="annotation ' + this.uuid + '" title=" ' + this.text + ' " style="left: ' + this.x + 'px; top: ' + this.y + 'px;"></div>');
                        // Pick out the note div so that we can keep track
                        this.noteDiv = divaSettings.parentSelector.find("." + this.uuid);
                        // Make the note draggable
                        this.bindDraggable();
                    };

                    /**
                     * Remove the note Div from browser.
                     */
                    Annotation.prototype.unRender = function ()
                    {
                        this.noteDiv.remove();
                    };

                    return Annotation;
                })();


                /*
                 * Private functions
                 */

                /**
                 * Render the "Edit Annotation" window's content.
                 *
                 * @param annotation
                 * @private
                 */
                function _render_annotate_window(annotation)
                {
                    // So that we don't have memory leaks
                    annotationsDiv.empty();

                    var content = '<div class="diva-annotate-window-form"><div class="diva-annotate-window-toolbar">' +
                        '<div class="diva-annotate-window-close" ' +
                        'title="Close the annotation window"></div></div>';

                    content += '<h3>Edit Annotation</h3> <form class="edit-annotation">' +
                        '<textarea rows="4" cols="35" class="annotation-name" placeholder="Name">'
                        + annotation.text + '</textarea></form></div>';

                    // Fill it with the content
                    annotationsDiv.html(content);

                    annotationsDiv.find(".annotation-name").each(
                        function()
                        {
                            $(this).change(
                                function(event)
                                {
                                    var newText = $(this).val();
                                    annotation.setText(newText);
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
                 * Get all of the currently visible pages.
                 *
                 * @returns {Array}
                 * @private
                 */
                function _get_visible_pages()
                {
                    var visiblePages = [];
                    var currentPage = divaInstance.getCurrentPageIndex();
                    var length = divaInstance.getNumberOfPages();
                    visiblePages.push(currentPage);
                    // Pages above the current
                    for (var i = currentPage + 1; i < length; i++)
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
                    // Add one extra to the end
                    if (i !== length)
                    {
                        visiblePages.push(i);
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
                    // Add one extra to the beginning
                    if (i >= 0)
                    {
                        visiblePages.push(i);
                    }
                    return visiblePages.sort(function(a,b){return a-b;});
                }


                function _prepare_clickable_annotations()
                {
                    // Get all of currently visible pages
                    var visiblePages = _get_visible_pages();
                    // Hide all of the visible annotations
                    for (var i = 0; i <  visibleAnnotations.length; i++)
                    {
                        visibleAnnotations[i].unRender();
                    }
                    // Make a new visible annotations list
                    visibleAnnotations = [];
                    for (i = 0; i < annotationObj.length; i++)
                    {
                        if (visiblePages.indexOf(annotationObj[i].pageIdx) > -1)
                        {
                            // Keep track of it
                            visibleAnnotations.push(annotationObj[i]);
                            // Render it
                            annotationObj[i].render();
                        }
                    }
                }

                /*
                 * Public functions
                 */

                /**
                 * Create an annotation from the properties array.
                 *
                 * @param properties {x: int, y: int, page: int, text: string}
                 */
                divaInstance.createAnnotationFromProperties = function (properties)
                {
                    // Create the note
                    var note = new Annotation(properties.x, properties.y);
                    note.pageIdx = parseInt(properties.page);
                    note.setText(properties.text);
                    // Save it
                    annotationObj.push(note);
                    // Render it
                    note.render();
                };

                divaInstance.createAnnotation = function()
                {
                    var note = new Annotation(0,0);
                    annotationObj.push(note);
                };

                /**
                 * Flushes all of the Page Annotations
                 */
                divaInstance.removeAllPageAnnotations = function()
                {
                    // Clear out the page annotations
                    annotationObj.page = {};
                };

                divaInstance.getAnnotations = function()
                {
                   return annotationObj;
                };

                return true;
            },
            handleClick: function(event, divaSettings)
            {
                // Grab the diva instance
                var divaInstance = $(divaSettings.parentSelector).data("diva");
                divaInstance.createAnnotation();
                return false;
            },
            pluginName: 'annotate',
            titleText: 'Annotate text on page'
        };
        return retval;
    })());
})(jQuery);
