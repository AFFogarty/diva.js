/*
Textual annotation plugin for diva.js
Allows you to highlight regions of a page image
*/

(function ($)
{
    window.divaPlugins.push((function()
    {
        var settings = {};
        var retval =
        {
            init: function(divaSettings, divaInstance)
            {
                // Initialize an empty highlights object.
                divaSettings.parentSelector.data(
                        'annotations',
                        {
                            page: {},
                            area: {}
                        });
                var annotationObj = divaSettings.parentSelector.data('annotations');
                
                // Event handlers
                diva.Events.subscribe("VisiblePageDidChange", _page_change_event_handler); 
                diva.Events.subscribe("HighlightCompleted", _prepare_clickable_annotations);
                
                /*
                 * Private functions
                 */
                
                /**
                 * Callback function fired when the page changes.
                 * 
                 * @param {type} pageIdx
                 * @returns {undefined}
                 */
                function _page_change_event_handler(pageIdx, pageName)
                {
                    // Save the current page
                    currentPage = pageIdx;
                    // Point to the correct 
                    
                    if (annotationObj.page[pageIdx])
                    {
                        // Print it out to the console.
                        diva.Events.publish("PageAnnotation", [annotationObj.page[pageIdx]]);
                        
                    }
                }
                
                function _area_click_event_handler()
                {
                    // TODO
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
                        return;
                    
                    if (highlightObj.hasOwnProperty(pageIdx))
                    {
                        // Create a box to represent the area
                        
                    }
                    diva.Events.publish("AnnotateAreaCompleted");                    
                };
                
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
                        else break;
                    }
                    // Pages below the current
                    for (i = currentPage - 1; i >= 0; i--)
                    {
                        if (divaInstance.isPageInViewport(i))
                        {
                            visiblePages.push(i);
                        }
                        else break;
                    }    
                    visiblePages = visiblePages.sort(function(a,b){return a-b;});
                    console.log(visiblePages);      
                    
                    // We now have the visible pages, so we want to prepare the
                    // clickable boxes on those pages
                    
                                      
                        

                };
                
                function _calculate_pointer_collision(boxes)
                {
                    // Store a list of x
//                    var xCollisions = [];
                    
                }
                
                 
                /*
                 * Public functions
                 */
                
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
                
                divaInstance.annotateAreaOnPage = function(pageIdx, textContent, regions, colour, divClass)
                {                 
                    // Create the corresponding highlight box
                    divaInstance.highlightOnPage(pageIdx, regions, colour, divClass);
                    
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
            pluginName: 'annotate',
            titleText: 'Annotate text on page'
        };
        return retval;
    })());
})(jQuery);
